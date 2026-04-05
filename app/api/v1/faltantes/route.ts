import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const estado_raw = params.get("estado");
  const sucursal_id_raw = params.get("sucursal_id");

  const sucursal_id = sucursal_id_raw
    ? Number(sucursal_id_raw)
    : db_user.sucursal_id ?? undefined;

  const where = {
    ...(sucursal_id ? { sucursal_id } : {}),
    ...(estado_raw ? { estado: estado_raw as "pendiente" | "atendido" } : {}),
  };

  const faltantes = await prisma.faltante.findMany({
    where,
    orderBy: [{ estado: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      cantidad_faltante: true,
      motivo: true,
      estado: true,
      created_at: true,
      producto: { select: { id: true, nombre: true, sku: true } },
      sucursal: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true } },
    },
  });

  const data = faltantes.map((f) => ({
    id: f.id,
    cantidad_faltante: f.cantidad_faltante,
    motivo: f.motivo,
    estado: f.estado,
    created_at: f.created_at.toISOString(),
    producto_id: f.producto.id,
    producto_nombre: f.producto.nombre,
    producto_sku: f.producto.sku,
    sucursal_id: f.sucursal.id,
    sucursal_nombre: f.sucursal.nombre,
    usuario_nombre: f.usuario?.nombre ?? null,
  }));

  return api_ok(data, { total: data.length });
}

export async function POST(request: NextRequest) {
  const { auth_user, db_user, error } = await require_auth();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { producto_id, cantidad_faltante = 1, motivo } = (body ?? {}) as {
    producto_id?: number;
    cantidad_faltante?: number;
    motivo?: string;
  };

  if (!producto_id || !Number.isInteger(producto_id)) {
    return api_err(400, "MISSING_PRODUCTO", "producto_id es requerido.");
  }
  if (!Number.isInteger(cantidad_faltante) || cantidad_faltante <= 0) {
    return api_err(400, "INVALID_CANTIDAD", "cantidad_faltante debe ser mayor a 0.");
  }

  const sucursal_id = db_user.sucursal_id;
  if (!sucursal_id) {
    return api_err(422, "NO_SUCURSAL", "Tu usuario no tiene una sucursal asignada.");
  }

  const faltante = await prisma.faltante.create({
    data: {
      producto_id,
      sucursal_id,
      usuario_id: auth_user.id,
      cantidad_faltante,
      motivo: typeof motivo === "string" && motivo.trim() ? motivo.trim() : null,
      estado: "pendiente",
    },
    select: { id: true, producto_id: true, sucursal_id: true, cantidad_faltante: true, estado: true },
  });

  return api_ok(faltante, undefined, 201);
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

  const { id, estado = "atendido" } = (body ?? {}) as {
    id?: number;
    estado?: string;
  };

  if (!id || !Number.isInteger(id)) {
    return api_err(400, "MISSING_ID", "id del faltante es requerido.");
  }

  const estados_validos = ["pendiente", "atendido"];
  if (!estados_validos.includes(estado)) {
    return api_err(400, "INVALID_ESTADO", `estado debe ser uno de: ${estados_validos.join(", ")}.`);
  }

  const existing = await prisma.faltante.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return api_err(404, "NOT_FOUND", `No se encontro faltante con id ${id}.`);
  }

  const updated = await prisma.faltante.update({
    where: { id },
    data: { estado: estado as "pendiente" | "atendido" },
    select: { id: true, estado: true, updated_at: true },
  });

  return api_ok({ ...updated, updated_at: updated.updated_at.toISOString() });
}
