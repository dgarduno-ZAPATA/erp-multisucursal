import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { get_current_user } from "@/lib/auth/session";
import type { ApiResponse } from "@/types/api";

export function api_ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
): NextResponse {
  const body: ApiResponse<T> = { success: true, data, error: null, meta: meta ?? null };
  return NextResponse.json(body, { status });
}

export function api_err(status: number, code: string, message: string): NextResponse {
  const body: ApiResponse<null> = {
    success: false,
    data: null,
    error: { code, message },
    meta: null,
  };
  return NextResponse.json(body, { status });
}

export async function require_auth() {
  const auth_user = await get_current_user();
  if (!auth_user) {
    return {
      auth_user: null,
      db_user: null,
      error: api_err(401, "UNAUTHORIZED", "Sesion requerida."),
    } as const;
  }

  const db_user = await prisma.usuario.findUnique({
    where: { id: auth_user.id },
    select: { id: true, sucursal_id: true, rol: true },
  });

  if (!db_user) {
    return {
      auth_user,
      db_user: null,
      error: api_err(401, "USER_NOT_FOUND", "Usuario no registrado en el sistema."),
    } as const;
  }

  return { auth_user, db_user, error: null } as const;
}

export function parse_page(params: URLSearchParams): { skip: number; take: number; page: number; page_size: number } {
  const page = Math.max(1, Number(params.get("page") ?? 1));
  const page_size = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 20)));
  return { skip: (page - 1) * page_size, take: page_size, page, page_size };
}
