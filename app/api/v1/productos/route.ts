import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth, parse_page } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  const { error } = await require_auth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { skip, take, page, page_size } = parse_page(params);

  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const categoria = params.get("categoria")?.trim();
  const activo_raw = params.get("activo");
  const barcode = params.get("barcode")?.trim();

  // Barcode lookup — returns single product
  if (barcode) {
    const producto = await prisma.producto.findUnique({
      where: { codigo_barras: barcode },
      select: {
        id: true,
        sku: true,
        codigo_barras: true,
        nombre: true,
        categoria: true,
        precio: true,
        costo: true,
        stock_minimo: true,
        imagenUrl: true,
        activo: true,
        inventario: {
          select: { sucursal_id: true, stock_actual: true, stock_minimo: true },
        },
      },
    });
    if (!producto) {
      return api_err(404, "NOT_FOUND", `No se encontro producto con codigo de barras: ${barcode}`);
    }
    return api_ok({
      ...producto,
      precio: Number(producto.precio),
      costo: producto.costo !== null ? Number(producto.costo) : null,
    });
  }

  const activo =
    activo_raw === "true" ? true : activo_raw === "false" ? false : undefined;

  const where = {
    ...(activo !== undefined ? { activo } : {}),
    ...(categoria ? { categoria } : {}),
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { codigo_barras: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, productos] = await Promise.all([
    prisma.producto.count({ where }),
    prisma.producto.findMany({
      where,
      skip,
      take,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        sku: true,
        codigo_barras: true,
        nombre: true,
        categoria: true,
        precio: true,
        costo: true,
        stock_minimo: true,
        imagenUrl: true,
        activo: true,
        inventario: {
          select: { sucursal_id: true, stock_actual: true, stock_minimo: true },
        },
      },
    }),
  ]);

  const data = productos.map((p) => ({
    ...p,
    precio: Number(p.precio),
    costo: p.costo !== null ? Number(p.costo) : null,
    stock_total: p.inventario.reduce((s, i) => s + i.stock_actual, 0),
  }));

  return api_ok(data, { total, page, page_size, pages: Math.ceil(total / page_size) });
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

  const {
    sku,
    nombre,
    categoria = "General",
    codigo_barras,
    precio,
    costo,
    stock_minimo = 5,
    imagenUrl,
  } = (body ?? {}) as {
    sku?: string;
    nombre?: string;
    categoria?: string;
    codigo_barras?: string;
    precio?: number;
    costo?: number;
    stock_minimo?: number;
    imagenUrl?: string;
  };

  if (!sku?.trim()) return api_err(400, "MISSING_SKU", "sku es requerido.");
  if (!nombre?.trim()) return api_err(400, "MISSING_NOMBRE", "nombre es requerido.");
  if (!Number.isFinite(precio) || (precio as number) <= 0) {
    return api_err(400, "INVALID_PRECIO", "precio debe ser mayor a 0.");
  }

  try {
    const producto = await prisma.producto.create({
      data: {
        sku: sku.trim(),
        nombre: nombre.trim(),
        categoria: categoria?.trim() || "General",
        codigo_barras: codigo_barras?.trim() || null,
        precio: precio as number,
        costo: Number.isFinite(costo) ? (costo as number) : null,
        stock_minimo: Number.isInteger(stock_minimo) && stock_minimo >= 0 ? stock_minimo : 5,
        imagenUrl: imagenUrl?.trim() || null,
        activo: true,
      },
      select: { id: true, sku: true, nombre: true, precio: true },
    });
    return api_ok({ ...producto, precio: Number(producto.precio) }, undefined, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return api_err(409, "DUPLICATE_SKU", "Ya existe un producto con ese SKU o codigo de barras.");
    }
    return api_err(500, "DB_ERROR", "Error al crear el producto.");
  }
}
