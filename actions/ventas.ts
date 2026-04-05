"use server";

import type { MetodoPago } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { log_inventory_movement } from "@/lib/inventory/movements";
import { get_current_user } from "@/lib/auth/session";
import { get_accessible_sucursales, get_user_operating_assignment } from "@/lib/auth/operating-context";
import { can_cancel_sales, require_roles } from "@/lib/auth/rbac";
import type { PosCartItem } from "@/hooks/use-pos-store";

type ProcesarVentaResult =
  | {
      success: true;
      venta_id: number;
    }
  | {
      success: false;
      error: string;
    };

type GetVentasOptions = {
  sucursal_id?: number;
  estado?: "pendiente" | "completada" | "cancelada";
  fecha_desde?: string;
  fecha_hasta?: string;
  limit?: number;
};

export async function getVentas(options: GetVentasOptions = {}) {
  const db_user = await require_roles(["admin", "gerente"]);
  const { sucursales } = await get_accessible_sucursales();
  const sucursal_ids = sucursales.map((sucursal) => sucursal.id);
  const limit = Math.min(100, Math.max(1, options.limit ?? 40));
  const sucursal_id =
    options.sucursal_id && sucursal_ids.includes(options.sucursal_id)
      ? options.sucursal_id
      : db_user.rol === "admin"
        ? undefined
        : db_user.sucursal_id ?? undefined;

  const ventas = await prisma.venta.findMany({
    where: {
      ...(sucursal_ids.length > 0 ? { sucursal_id: { in: sucursal_ids } } : { id: -1 }),
      ...(sucursal_id ? { sucursal_id } : {}),
      ...(options.estado ? { estado: options.estado } : {}),
      ...(options.fecha_desde || options.fecha_hasta
        ? {
            fecha_venta: {
              ...(options.fecha_desde ? { gte: new Date(options.fecha_desde) } : {}),
              ...(options.fecha_hasta ? { lte: new Date(options.fecha_hasta) } : {}),
            },
          }
        : {}),
    },
    orderBy: {
      fecha_venta: "desc",
    },
    take: limit,
    select: {
      id: true,
      folio: true,
      subtotal: true,
      descuento: true,
      total: true,
      metodo_pago: true,
      estado: true,
      synced: true,
      fecha_venta: true,
      sucursal_id: true,
      sucursal: {
        select: {
          id: true,
          nombre: true,
        },
      },
      usuario: {
        select: {
          id: true,
          nombre: true,
        },
      },
      cliente: {
        select: {
          id: true,
          nombre: true,
        },
      },
      detalle_venta: {
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          cantidad: true,
          precio_unitario: true,
          subtotal: true,
          producto_id: true,
          producto: {
            select: {
              id: true,
              sku: true,
              nombre: true,
            },
          },
        },
      },
    },
  });

  return ventas.map((venta) => ({
    ...venta,
    subtotal: Number(venta.subtotal),
    descuento: Number(venta.descuento),
    total: Number(venta.total),
    fecha_venta: venta.fecha_venta.toISOString(),
    detalle_venta: venta.detalle_venta.map((detalle) => ({
      ...detalle,
      precio_unitario: Number(detalle.precio_unitario),
      subtotal: Number(detalle.subtotal),
    })),
  }));
}

export async function cancelarVenta(venta_id: number, motivo?: string) {
  const db_user = await require_roles(["admin", "gerente"]);

  if (!can_cancel_sales(db_user.rol)) {
    return { success: false as const, error: "Solo gerente o administrador pueden cancelar ventas." };
  }

  const { sucursales } = await get_accessible_sucursales();
  const sucursal_ids = sucursales.map((sucursal) => sucursal.id);

  if (!Number.isInteger(venta_id) || venta_id <= 0) {
    return { success: false as const, error: "Venta invalida." };
  }

  const venta = await prisma.venta.findUnique({
    where: { id: venta_id },
    select: {
      id: true,
      folio: true,
      estado: true,
      sucursal_id: true,
      detalle_venta: {
        select: {
          producto_id: true,
          cantidad: true,
          producto: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  if (!venta) {
    return { success: false as const, error: "La venta no existe." };
  }

  if (!sucursal_ids.includes(venta.sucursal_id)) {
    return { success: false as const, error: "No tienes acceso a la sucursal de esta venta." };
  }

  if (db_user.rol !== "admin" && db_user.sucursal_id !== venta.sucursal_id) {
    return { success: false as const, error: "No puedes cancelar ventas de otra sucursal." };
  }

  if (venta.estado === "cancelada") {
    return { success: false as const, error: "La venta ya estaba cancelada." };
  }

  if (venta.detalle_venta.length === 0) {
    return { success: false as const, error: "La venta no tiene partidas para revertir." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.venta.update({
        where: { id: venta.id },
        data: {
          estado: "cancelada",
        },
      });

      for (const detalle of venta.detalle_venta) {
        const inventario = await tx.inventario.findUnique({
          where: {
            producto_id_sucursal_id: {
              producto_id: detalle.producto_id,
              sucursal_id: venta.sucursal_id,
            },
          },
          select: {
            stock_actual: true,
            stock_minimo: true,
          },
        });

        const stock_anterior = inventario?.stock_actual ?? 0;
        const stock_nuevo = stock_anterior + detalle.cantidad;

        await tx.inventario.upsert({
          where: {
            producto_id_sucursal_id: {
              producto_id: detalle.producto_id,
              sucursal_id: venta.sucursal_id,
            },
          },
          update: {
            stock_actual: stock_nuevo,
          },
          create: {
            producto_id: detalle.producto_id,
            sucursal_id: venta.sucursal_id,
            stock_actual: detalle.cantidad,
            stock_minimo: inventario?.stock_minimo ?? 0,
          },
        });

        await log_inventory_movement(
          {
            producto_id: detalle.producto_id,
            sucursal_id: venta.sucursal_id,
            usuario_id: db_user.id,
            tipo: "entrada",
            cantidad: detalle.cantidad,
            stock_anterior,
            stock_nuevo,
            motivo: motivo?.trim() || `Cancelacion de venta: ${detalle.producto.nombre}`,
            referencia: venta.folio,
          },
          tx,
        );
      }
    });
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo cancelar la venta.",
    };
  }

  revalidatePath("/ventas");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");

  return { success: true as const };
}

export async function procesarVenta(
  items: PosCartItem[],
  total: number,
  metodo_pago: MetodoPago,
  operator_id?: string, // PIN-authenticated operator (overrides Supabase auth user)
): Promise<ProcesarVentaResult> {
  if (!items.length) {
    return { success: false, error: "El carrito esta vacio." };
  }

  const auth_user = await get_current_user();
  if (!auth_user) {
    return { success: false, error: "No hay sesion activa. Inicia sesion para procesar ventas." };
  }

  // Resolve the operating user: PIN operator takes precedence over Supabase auth user
  const lookup_id = operator_id ?? auth_user.id;
  const operating_assignment = await get_user_operating_assignment(lookup_id);
  const usuario = operating_assignment?.usuario ?? null;

  if (!usuario) {
    return {
      success: false,
      error: operator_id
        ? "El operador PIN no está registrado o no está activo."
        : "Tu usuario no esta registrado en el sistema.",
    };
  }

  const sucursal_id = operating_assignment?.sucursal_id ?? null;

  if (!sucursal_id) {
    return {
      success: false,
      error:
        usuario.rol === "vendedor" || usuario.rol === "cajero"
          ? "El operador debe registrar su sucursal operativa del dia antes de vender."
          : "El usuario operador no tiene una sucursal asignada.",
    };
  }

  const inventario_actual = await prisma.inventario.findMany({
    where: {
      sucursal_id,
      producto_id: {
        in: items.map((item) => item.producto_id),
      },
    },
    select: {
      producto_id: true,
      stock_actual: true,
    },
  });

  for (const item of items) {
    const inventario = inventario_actual.find(
      (registro) => registro.producto_id === item.producto_id,
    );

    if (!inventario) {
      return {
        success: false,
        error: `No existe inventario para el producto ${item.nombre} en la sucursal actual.`,
      };
    }

    if (inventario.stock_actual < item.cantidad) {
      return {
        success: false,
        error: `Stock insuficiente para ${item.nombre}. Disponible: ${inventario.stock_actual}.`,
      };
    }
  }

  const subtotal_calculado = items.reduce(
    (sum, item) => sum + item.precio_unitario * item.cantidad,
    0,
  );
  const total_venta = Number.isFinite(total) && total > 0 ? total : subtotal_calculado;

  const folio = `VTA-${Date.now()}`;

  try {
    const venta = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const inventario = await tx.inventario.findUnique({
          where: {
            producto_id_sucursal_id: {
              producto_id: item.producto_id,
              sucursal_id,
            },
          },
          select: {
            id: true,
            stock_actual: true,
          },
        });

        if (!inventario) {
          throw new Error(
            `No existe inventario para el producto ${item.nombre} en la sucursal actual.`,
          );
        }

        if (inventario.stock_actual < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${item.nombre}. Disponible: ${inventario.stock_actual}.`,
          );
        }
      }

      const venta_creada = await tx.venta.create({
        data: {
          sucursal_id,
          usuario_id: usuario.id,
          folio,
          subtotal: subtotal_calculado,
          descuento: 0,
          total: total_venta,
          metodo_pago,
        },
        select: {
          id: true,
        },
      });

      await tx.detalleVenta.createMany({
        data: items.map((item) => ({
          venta_id: venta_creada.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.precio_unitario * item.cantidad,
        })),
      });

      for (const item of items) {
        const inventario = await tx.inventario.findUnique({
          where: {
            producto_id_sucursal_id: {
              producto_id: item.producto_id,
              sucursal_id,
            },
          },
          select: {
            stock_actual: true,
          },
        });

        await tx.inventario.update({
          where: {
            producto_id_sucursal_id: {
              producto_id: item.producto_id,
              sucursal_id,
            },
          },
          data: {
            stock_actual: {
              decrement: item.cantidad,
            },
          },
        });

        const stock_anterior = inventario?.stock_actual ?? item.cantidad;
        const stock_nuevo = stock_anterior - item.cantidad;

        await log_inventory_movement(
          {
            producto_id: item.producto_id,
            sucursal_id,
            usuario_id: usuario.id,
            tipo: "salida",
            cantidad: item.cantidad,
            stock_anterior,
            stock_nuevo,
            motivo: "Salida por venta",
            referencia: folio,
          },
          tx,
        );
      }

      return venta_creada;
    });

    return {
      success: true,
      venta_id: venta.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? `No fue posible procesar la venta: ${error.message}`
          : "No fue posible procesar la venta.",
    };
  }
}
