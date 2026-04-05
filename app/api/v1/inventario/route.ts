import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth, parse_page } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { skip, take, page, page_size } = parse_page(params);

  const sucursal_id_raw = params.get("sucursal_id");
  const producto_id_raw = params.get("producto_id");
  const low_stock = params.get("low_stock") === "true";

  const sucursal_id = sucursal_id_raw
    ? Number(sucursal_id_raw)
    : db_user.sucursal_id ?? undefined;

  const where = {
    ...(sucursal_id ? { sucursal_id } : {}),
    ...(producto_id_raw ? { producto_id: Number(producto_id_raw) } : {}),
  };

  const [total, registros_raw] = await Promise.all([
    prisma.inventario.count({ where }),
    prisma.inventario.findMany({
      where,
      skip,
      take,
      orderBy: { stock_actual: "asc" },
      select: {
        id: true,
        stock_actual: true,
        stock_minimo: true,
        updated_at: true,
        producto: {
          select: { id: true, sku: true, nombre: true, categoria: true, precio: true },
        },
        sucursal: { select: { id: true, nombre: true } },
      },
    }),
  ]);

  let registros = registros_raw.map((r) => ({
    ...r,
    precio: Number(r.producto.precio),
    en_riesgo: r.stock_actual <= r.stock_minimo,
    updated_at: r.updated_at.toISOString(),
    producto: { ...r.producto, precio: Number(r.producto.precio) },
  }));

  if (low_stock) {
    registros = registros.filter((r) => r.en_riesgo);
  }

  return api_ok(registros, { total, page, page_size, pages: Math.ceil(total / page_size) });
}

export async function POST(request: NextRequest) {
  const { error } = await require_auth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { producto_id, sucursal_id, stock_actual = 0, stock_minimo = 5 } = (body ?? {}) as {
    producto_id?: number;
    sucursal_id?: number;
    stock_actual?: number;
    stock_minimo?: number;
  };

  if (!producto_id || !Number.isInteger(producto_id)) {
    return api_err(400, "MISSING_PRODUCTO", "producto_id es requerido.");
  }
  if (!sucursal_id || !Number.isInteger(sucursal_id)) {
    return api_err(400, "MISSING_SUCURSAL", "sucursal_id es requerido.");
  }

  try {
    const registro = await prisma.inventario.create({
      data: {
        producto_id,
        sucursal_id,
        stock_actual: Math.max(0, stock_actual),
        stock_minimo: Math.max(0, stock_minimo),
      },
      select: {
        id: true,
        producto_id: true,
        sucursal_id: true,
        stock_actual: true,
        stock_minimo: true,
      },
    });
    return api_ok(registro, undefined, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return api_err(409, "DUPLICATE", "Ya existe un registro de inventario para ese producto y sucursal.");
    }
    return api_err(500, "DB_ERROR", "Error al crear el registro de inventario.");
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await require_auth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { producto_id, sucursal_id, stock_minimo, ajuste } = (body ?? {}) as {
    producto_id?: number;
    sucursal_id?: number;
    stock_minimo?: number;
    ajuste?: number;
  };

  if (!producto_id || !sucursal_id) {
    return api_err(400, "MISSING_IDS", "producto_id y sucursal_id son requeridos.");
  }

  const existing = await prisma.inventario.findUnique({
    where: { producto_id_sucursal_id: { producto_id, sucursal_id } },
    select: { id: true, stock_actual: true },
  });

  if (!existing) {
    return api_err(404, "NOT_FOUND", "No existe registro de inventario para ese producto y sucursal.");
  }

  if (ajuste !== undefined && !Number.isFinite(ajuste)) {
    return api_err(400, "INVALID_AJUSTE", "ajuste debe ser un numero entero.");
  }

  if (ajuste !== undefined && existing.stock_actual + ajuste < 0) {
    return api_err(
      422,
      "NEGATIVE_STOCK",
      `El ajuste dejaría el stock en ${existing.stock_actual + ajuste}. No puede ser negativo.`,
    );
  }

  const data: Record<string, unknown> = {};
  if (ajuste !== undefined) data.stock_actual = { increment: ajuste };
  if (stock_minimo !== undefined && Number.isInteger(stock_minimo) && stock_minimo >= 0) {
    data.stock_minimo = stock_minimo;
  }

  if (Object.keys(data).length === 0) {
    return api_err(400, "NOTHING_TO_UPDATE", "Incluye ajuste o stock_minimo para actualizar.");
  }

  const updated = await prisma.inventario.update({
    where: { producto_id_sucursal_id: { producto_id, sucursal_id } },
    data,
    select: { id: true, producto_id: true, sucursal_id: true, stock_actual: true, stock_minimo: true },
  });

  return api_ok(updated);
}
