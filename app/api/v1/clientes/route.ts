import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err, require_auth, parse_page } from "@/lib/api/helpers";

export async function GET(request: NextRequest) {
  const { error } = await require_auth();
  if (error) return error;

  const params = request.nextUrl.searchParams;
  const { skip, take, page, page_size } = parse_page(params);

  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const activo_raw = params.get("activo");
  const activo = activo_raw === "false" ? false : true;

  const where = {
    activo,
    ...(search
      ? {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { telefono: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, clientes] = await Promise.all([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      skip,
      take,
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        direccion: true,
        activo: true,
        created_at: true,
        _count: { select: { ventas: true } },
      },
    }),
  ]);

  const data = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    direccion: c.direccion,
    activo: c.activo,
    total_compras: c._count.ventas,
    created_at: c.created_at.toISOString(),
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

  const { nombre, email, telefono, direccion } = (body ?? {}) as {
    nombre?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
  };

  if (!nombre?.trim()) return api_err(400, "MISSING_NOMBRE", "nombre es requerido.");

  try {
    const cliente = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        email: email?.trim() || null,
        telefono: telefono?.trim() || null,
        direccion: direccion?.trim() || null,
        activo: true,
      },
      select: { id: true, nombre: true, email: true, telefono: true, activo: true },
    });
    return api_ok(cliente, undefined, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return api_err(409, "DUPLICATE_EMAIL", "Ya existe un cliente con ese email.");
    }
    return api_err(500, "DB_ERROR", "Error al crear el cliente.");
  }
}
