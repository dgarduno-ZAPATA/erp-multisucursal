"use server";

import { revalidatePath } from "next/cache";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { get_current_user } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { log_inventory_movement } from "@/lib/inventory/movements";

function decimal_to_number(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function generate_folio() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `OC-${y}${m}${d}-${rand}`;
}

type LineaOrden = {
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
};

// ─── Crear orden de compra ───────────────────────────────────────────────────

export async function createOrdenCompra(data: {
  proveedor_id: number;
  sucursal_id: number;
  fecha_esperada?: string;
  notas?: string;
  lineas: LineaOrden[];
}) {
  await require_roles(["admin", "gerente"]);
  const { sucursales } = await get_accessible_sucursales();
  const branch_ids = sucursales.map((s) => s.id);

  if (!branch_ids.includes(data.sucursal_id)) {
    return { success: false as const, error: "Sucursal no accesible." };
  }

  if (!data.lineas.length) {
    return { success: false as const, error: "Agrega al menos un producto." };
  }

  const proveedor = await prisma.proveedor.findUnique({
    where: { id: data.proveedor_id, activo: true },
    select: { id: true, dias_credito: true, frecuencia_visita: true },
  });
  if (!proveedor) return { success: false as const, error: "Proveedor no encontrado." };

  const total = data.lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);

  const fecha_esperada = data.fecha_esperada
    ? new Date(`${data.fecha_esperada}T00:00:00`)
    : null;

  const fecha_vencimiento =
    proveedor.dias_credito > 0
      ? new Date(Date.now() + proveedor.dias_credito * 24 * 60 * 60 * 1000)
      : null;

  await prisma.ordenCompra.create({
    data: {
      proveedor_id: data.proveedor_id,
      sucursal_id: data.sucursal_id,
      folio: generate_folio(),
      fecha_esperada,
      fecha_vencimiento,
      total,
      notas: data.notas?.trim() || null,
      detalle: {
        create: data.lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad_pedida: l.cantidad,
          precio_unitario: l.precio_unitario,
          subtotal: l.cantidad * l.precio_unitario,
        })),
      },
    },
  });

  revalidatePath(`/inventario/proveedores/${data.proveedor_id}`);
  return { success: true as const };
}

// ─── Recibir orden ───────────────────────────────────────────────────────────

type RecepcionLinea = {
  detalle_id: number;
  cantidad_recibida: number;
  precio_unitario: number;
};

export async function recibirOrden(orden_id: number, recepciones: RecepcionLinea[]) {
  await require_roles(["admin", "gerente"]);

  const user = await get_current_user();
  if (!user) return { success: false as const, error: "Sin sesión activa." };

  const orden = await prisma.ordenCompra.findUnique({
    where: { id: orden_id },
    include: {
      detalle: true,
      proveedor: { select: { id: true, frecuencia_visita: true } },
    },
  });

  if (!orden) return { success: false as const, error: "Orden no encontrada." };
  if (orden.estado === "cancelada") return { success: false as const, error: "La orden está cancelada." };
  if (orden.estado === "recibida") return { success: false as const, error: "La orden ya fue recibida." };

  const total_pedido = orden.detalle.reduce((acc, d) => acc + d.cantidad_pedida, 0);
  const total_recibido = recepciones.reduce((acc, r) => acc + r.cantidad_recibida, 0);

  await prisma.$transaction(async (tx) => {
    for (const rec of recepciones) {
      if (rec.cantidad_recibida <= 0) continue;

      const linea = orden.detalle.find((d) => d.id === rec.detalle_id);
      if (!linea) continue;

      // Actualizar cantidad recibida en el detalle
      await tx.detalleOrdenCompra.update({
        where: { id: rec.detalle_id },
        data: {
          cantidad_recibida: rec.cantidad_recibida,
          precio_unitario: rec.precio_unitario,
          subtotal: rec.cantidad_recibida * rec.precio_unitario,
        },
      });

      // Leer stock actual antes del ajuste
      const inv = await tx.inventario.findUnique({
        where: { producto_id_sucursal_id: { producto_id: linea.producto_id, sucursal_id: orden.sucursal_id } },
        select: { stock_actual: true },
      });
      const stock_anterior = inv?.stock_actual ?? 0;
      const stock_nuevo = stock_anterior + rec.cantidad_recibida;

      // Upsert inventario
      await tx.inventario.upsert({
        where: { producto_id_sucursal_id: { producto_id: linea.producto_id, sucursal_id: orden.sucursal_id } },
        create: { producto_id: linea.producto_id, sucursal_id: orden.sucursal_id, stock_actual: rec.cantidad_recibida },
        update: { stock_actual: { increment: rec.cantidad_recibida } },
      });

      // Registrar movimiento de inventario
      await log_inventory_movement({
        producto_id: linea.producto_id,
        sucursal_id: orden.sucursal_id,
        usuario_id: user.id,
        tipo: "entrada",
        cantidad: rec.cantidad_recibida,
        stock_anterior,
        stock_nuevo,
        motivo: "Recepción de orden de compra",
        referencia: orden.folio,
      });

      // Detectar y registrar cambio de precio
      const link = await tx.proveedorProducto.findUnique({
        where: { proveedor_id_producto_id: { proveedor_id: orden.proveedor_id, producto_id: linea.producto_id } },
        select: { precio_costo: true },
      });
      const precio_anterior = link?.precio_costo ? decimal_to_number(link.precio_costo) : null;
      const precio_nuevo = rec.precio_unitario;

      if (precio_anterior !== null && Math.abs(precio_anterior - precio_nuevo) > 0.001) {
        await tx.historialPrecioProveedor.create({
          data: {
            proveedor_id: orden.proveedor_id,
            producto_id: linea.producto_id,
            orden_id: orden.id,
            precio_anterior,
            precio_nuevo,
          },
        });
      }

      // Upsert el link proveedor-producto con el nuevo precio
      await tx.proveedorProducto.upsert({
        where: { proveedor_id_producto_id: { proveedor_id: orden.proveedor_id, producto_id: linea.producto_id } },
        create: { proveedor_id: orden.proveedor_id, producto_id: linea.producto_id, precio_costo: precio_nuevo },
        update: { precio_costo: precio_nuevo },
      });
    }

    // Estado de la orden
    const nuevo_estado = total_recibido >= total_pedido ? "recibida" : "recibida_parcial";

    // Avanzar próxima visita si el proveedor tiene frecuencia
    const frecuencia = orden.proveedor.frecuencia_visita;
    const proxima_visita = frecuencia
      ? new Date(Date.now() + frecuencia * 24 * 60 * 60 * 1000)
      : null;

    await tx.ordenCompra.update({
      where: { id: orden_id },
      data: {
        estado: nuevo_estado,
        fecha_recibida: new Date(),
        recibido_por: user.id,
      },
    });

    if (proxima_visita) {
      await tx.proveedor.update({
        where: { id: orden.proveedor_id },
        data: { proxima_visita },
      });
    }
  });

  revalidatePath(`/inventario/proveedores/${orden.proveedor_id}`);
  return { success: true as const };
}

// ─── Cancelar orden ──────────────────────────────────────────────────────────

export async function cancelarOrden(orden_id: number) {
  await require_roles(["admin", "gerente"]);

  const orden = await prisma.ordenCompra.findUnique({
    where: { id: orden_id },
    select: { estado: true, proveedor_id: true },
  });
  if (!orden) return { success: false as const, error: "Orden no encontrada." };
  if (orden.estado !== "pendiente") {
    return { success: false as const, error: "Solo se pueden cancelar órdenes pendientes." };
  }

  await prisma.ordenCompra.update({ where: { id: orden_id }, data: { estado: "cancelada" } });

  revalidatePath(`/inventario/proveedores/${orden.proveedor_id}`);
  return { success: true as const };
}

// ─── Registrar pago ──────────────────────────────────────────────────────────

export async function registrarPago(form_data: FormData) {
  await require_roles(["admin", "gerente"]);

  const orden_id = Number(form_data.get("orden_id"));
  const monto = Number(form_data.get("monto"));
  const metodo = String(form_data.get("metodo_pago") ?? "efectivo") as "efectivo" | "tarjeta" | "transferencia";
  const notas = String(form_data.get("notas") ?? "").trim() || null;

  if (!Number.isFinite(orden_id) || orden_id <= 0) {
    return { success: false as const, error: "Orden inválida." };
  }
  if (!Number.isFinite(monto) || monto <= 0) {
    return { success: false as const, error: "El monto debe ser mayor a cero." };
  }

  const orden = await prisma.ordenCompra.findUnique({
    where: { id: orden_id },
    select: { total: true, monto_pagado: true, estado: true, proveedor_id: true },
  });
  if (!orden) return { success: false as const, error: "Orden no encontrada." };
  if (orden.estado === "cancelada") return { success: false as const, error: "La orden está cancelada." };

  const saldo = decimal_to_number(orden.total) - decimal_to_number(orden.monto_pagado);
  if (monto > saldo + 0.001) {
    return { success: false as const, error: `El monto excede el saldo pendiente (${saldo.toFixed(2)}).` };
  }

  await prisma.$transaction([
    prisma.pagoProveedor.create({ data: { orden_id, monto, metodo_pago: metodo, notas } }),
    prisma.ordenCompra.update({
      where: { id: orden_id },
      data: { monto_pagado: { increment: monto } },
    }),
  ]);

  revalidatePath(`/inventario/proveedores/${orden.proveedor_id}`);
  return { success: true as const };
}
