import type { NextRequest } from "next/server";
import type { MetodoPago } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { log_inventory_movement } from "@/lib/inventory/movements";
import { api_ok, api_err, require_auth, parse_page } from "@/lib/api/helpers";
import { can_cancel_sales } from "@/lib/auth/rbac";

export async function GET(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { skip, take, page, page_size } = parse_page(params);

  const sucursal_id_raw = params.get("sucursal_id");
  const estado_raw = params.get("estado");
  const fecha_desde_raw = params.get("fecha_desde");
  const fecha_hasta_raw = params.get("fecha_hasta");

  const sucursal_id = sucursal_id_raw ? Number(sucursal_id_raw) : db_user.sucursal_id ?? undefined;

  const where = {
    ...(sucursal_id ? { sucursal_id } : {}),
    ...(estado_raw ? { estado: estado_raw as "pendiente" | "completada" | "cancelada" } : {}),
    ...(fecha_desde_raw || fecha_hasta_raw
      ? {
          fecha_venta: {
            ...(fecha_desde_raw ? { gte: new Date(fecha_desde_raw) } : {}),
            ...(fecha_hasta_raw ? { lte: new Date(fecha_hasta_raw) } : {}),
          },
        }
      : {}),
  };

  const [total, ventas] = await Promise.all([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      skip,
      take,
      orderBy: { fecha_venta: "desc" },
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
        created_at: true,
        sucursal: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
        detalle_venta: {
          select: {
            id: true,
            cantidad: true,
            precio_unitario: true,
            subtotal: true,
            producto: { select: { id: true, sku: true, nombre: true } },
          },
        },
      },
    }),
  ]);

  const data = ventas.map((v) => ({
    ...v,
    subtotal: Number(v.subtotal),
    descuento: Number(v.descuento),
    total: Number(v.total),
    fecha_venta: v.fecha_venta.toISOString(),
    created_at: v.created_at.toISOString(),
    detalle_venta: v.detalle_venta.map((d) => ({
      ...d,
      precio_unitario: Number(d.precio_unitario),
      subtotal: Number(d.subtotal),
    })),
  }));

  return api_ok(data, { total, page, page_size, pages: Math.ceil(total / page_size) });
}

export async function POST(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  if (!body || typeof body !== "object") {
    return api_err(400, "BAD_REQUEST", "Cuerpo invalido.");
  }

  const { items, total, metodo_pago } = body as {
    items?: { producto_id: number; cantidad: number; precio_unitario: number; nombre?: string }[];
    total?: number;
    metodo_pago?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    return api_err(400, "EMPTY_CART", "El carrito no puede estar vacio.");
  }

  const metodos_validos: MetodoPago[] = ["efectivo", "tarjeta", "transferencia"];
  const metodo: MetodoPago = metodos_validos.includes(metodo_pago as MetodoPago)
    ? (metodo_pago as MetodoPago)
    : "efectivo";

  const sucursal_id = db_user.sucursal_id;
  if (!sucursal_id) {
    return api_err(422, "NO_SUCURSAL", "Tu usuario no tiene una sucursal asignada.");
  }

  const inventario_actual = await prisma.inventario.findMany({
    where: { sucursal_id, producto_id: { in: items.map((i) => i.producto_id) } },
    select: { producto_id: true, stock_actual: true },
  });

  for (const item of items) {
    const inv = inventario_actual.find((r) => r.producto_id === item.producto_id);
    if (!inv) {
      return api_err(422, "NO_INVENTORY", `Sin inventario para producto_id ${item.producto_id}.`);
    }
    if (inv.stock_actual < item.cantidad) {
      return api_err(
        422,
        "INSUFFICIENT_STOCK",
        `Stock insuficiente para producto_id ${item.producto_id}. Disponible: ${inv.stock_actual}.`,
      );
    }
  }

  const subtotal_calculado = items.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0);
  const total_venta = Number.isFinite(total) && (total as number) > 0 ? (total as number) : subtotal_calculado;
  const folio = `VTA-${Date.now()}`;

  try {
    const venta = await prisma.$transaction(async (tx) => {
      const venta_creada = await tx.venta.create({
        data: {
          sucursal_id,
          usuario_id: db_user.id,
          folio,
          subtotal: subtotal_calculado,
          descuento: 0,
          total: total_venta,
          metodo_pago: metodo,
        },
        select: { id: true, folio: true },
      });

      await tx.detalleVenta.createMany({
        data: items.map((i) => ({
          venta_id: venta_creada.id,
          producto_id: i.producto_id,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.precio_unitario * i.cantidad,
        })),
      });

      for (const item of items) {
        const inventario = await tx.inventario.findUnique({
          where: { producto_id_sucursal_id: { producto_id: item.producto_id, sucursal_id } },
          select: { stock_actual: true },
        });

        await tx.inventario.update({
          where: { producto_id_sucursal_id: { producto_id: item.producto_id, sucursal_id } },
          data: { stock_actual: { decrement: item.cantidad } },
        });

        const stock_anterior = inventario?.stock_actual ?? item.cantidad;
        const stock_nuevo = stock_anterior - item.cantidad;

        await log_inventory_movement(
          {
            producto_id: item.producto_id,
            sucursal_id,
            usuario_id: db_user.id,
            tipo: "salida",
            cantidad: item.cantidad,
            stock_anterior,
            stock_nuevo,
            motivo: "Salida por venta API",
            referencia: venta_creada.folio,
          },
          tx,
        );
      }

      return venta_creada;
    });

    return api_ok({ venta_id: venta.id, folio: venta.folio }, undefined, 201);
  } catch (err) {
    return api_err(
      500,
      "TRANSACTION_ERROR",
      err instanceof Error ? err.message : "Error al procesar la venta.",
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  if (!can_cancel_sales(db_user.rol)) {
    return api_err(403, "FORBIDDEN", "Solo gerente o administrador pueden cancelar ventas.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  if (!body || typeof body !== "object") {
    return api_err(400, "BAD_REQUEST", "Cuerpo invalido.");
  }

  const { venta_id, motivo } = body as {
    venta_id?: number;
    motivo?: string;
  };

  if (!Number.isInteger(venta_id) || Number(venta_id) <= 0) {
    return api_err(400, "INVALID_SALE", "venta_id invalido.");
  }

  const venta = await prisma.venta.findUnique({
    where: { id: Number(venta_id) },
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
    return api_err(404, "SALE_NOT_FOUND", "La venta no existe.");
  }

  if (db_user.rol !== "admin" && db_user.sucursal_id !== venta.sucursal_id) {
    return api_err(403, "FORBIDDEN", "No puedes cancelar ventas de otra sucursal.");
  }

  if (venta.estado === "cancelada") {
    return api_err(409, "SALE_ALREADY_CANCELLED", "La venta ya estaba cancelada.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.venta.update({
        where: { id: venta.id },
        data: { estado: "cancelada" },
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
            motivo: motivo?.trim() || `Cancelacion de venta API: ${detalle.producto.nombre}`,
            referencia: venta.folio,
          },
          tx,
        );
      }
    });
  } catch (err) {
    return api_err(
      500,
      "CANCEL_ERROR",
      err instanceof Error ? err.message : "Error al cancelar la venta.",
    );
  }

  return api_ok({ venta_id: venta.id, estado: "cancelada" });
}
