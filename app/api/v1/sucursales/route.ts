import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth } from "@/lib/api/helpers";

export async function GET() {
  const { error } = await require_auth();
  if (error) return error;

  const sucursales = await prisma.sucursal.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      direccion: true,
      telefono: true,
      activo: true,
      created_at: true,
    },
  });

  const data = sucursales.map((s) => ({
    ...s,
    created_at: s.created_at.toISOString(),
  }));

  return api_ok(data, { total: data.length });
}

export async function POST(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  if (db_user.rol !== "admin") {
    return api_err(403, "FORBIDDEN", "Solo los administradores pueden crear sucursales.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return api_err(400, "INVALID_JSON", "El cuerpo de la solicitud no es JSON valido.");
  }

  const { nombre, codigo, direccion, telefono } = (body ?? {}) as {
    nombre?: string;
    codigo?: string;
    direccion?: string;
    telefono?: string;
  };

  if (!nombre?.trim()) return api_err(400, "MISSING_NOMBRE", "nombre es requerido.");
  if (!codigo?.trim()) return api_err(400, "MISSING_CODIGO", "codigo es requerido.");

  try {
    const sucursal = await prisma.sucursal.create({
      data: {
        nombre: nombre.trim(),
        codigo: codigo.trim().toUpperCase(),
        direccion: direccion?.trim() || null,
        telefono: telefono?.trim() || null,
        activo: true,
      },
      select: { id: true, nombre: true, codigo: true, activo: true },
    });
    return api_ok(sucursal, undefined, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return api_err(409, "DUPLICATE_CODIGO", "Ya existe una sucursal con ese codigo.");
    }
    return api_err(500, "DB_ERROR", "Error al crear la sucursal.");
  }
}
