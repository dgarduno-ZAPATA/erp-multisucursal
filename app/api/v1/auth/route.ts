import { prisma } from "@/lib/db/prisma";
import { api_ok, api_err } from "@/lib/api/helpers";
import { get_current_user } from "@/lib/auth/session";

export async function GET() {
  const auth_user = await get_current_user();
  if (!auth_user) {
    return api_err(401, "UNAUTHORIZED", "No hay sesion activa.");
  }

  const db_user = await prisma.usuario.findUnique({
    where: { id: auth_user.id },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      sucursal: { select: { id: true, nombre: true, codigo: true } },
    },
  });

  if (!db_user) {
    return api_err(401, "USER_NOT_FOUND", "Usuario no registrado en el sistema.");
  }

  return api_ok({
    id: db_user.id,
    nombre: db_user.nombre,
    email: db_user.email,
    rol: db_user.rol,
    activo: db_user.activo,
    sucursal: db_user.sucursal,
  });
}

export async function POST() {
  return api_err(501, "NOT_IMPLEMENTED", "Usa Supabase Auth directamente para autenticacion.");
}
