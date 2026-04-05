import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth } from "@/lib/api/helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: { code: string } },
) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  if (!db_user.sucursal_id) {
    return api_err(422, "NO_SUCURSAL", "Tu usuario no tiene una sucursal asignada.");
  }

  const barcode = decodeURIComponent(params.code).trim();

  if (!barcode) {
    return api_err(400, "MISSING_CODE", "Codigo de barras requerido.");
  }

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
        where: { sucursal_id: db_user.sucursal_id },
        select: {
          sucursal_id: true,
          stock_actual: true,
          stock_minimo: true,
          sucursal: { select: { nombre: true } },
        },
      },
    },
  });

  if (!producto) {
    return api_err(404, "NOT_FOUND", `No se encontro producto con codigo: ${barcode}`);
  }

  return api_ok({
    ...producto,
    precio: Number(producto.precio),
    costo: producto.costo !== null ? Number(producto.costo) : null,
    stock_disponible: producto.inventario[0]?.stock_actual ?? 0,
  });
}
