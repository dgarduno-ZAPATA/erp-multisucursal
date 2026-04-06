import type { RolUsuario } from "@prisma/client";
import { redirect } from "next/navigation";

import { get_current_db_user } from "@/lib/auth/operating-context";
import { can_access } from "@/lib/auth/route-permissions";

export type { RolUsuario };
export { can_access };

function get_role_fallback(rol: RolUsuario | null | undefined) {
  return rol === "vendedor" || rol === "cajero" ? "/pos" : "/dashboard";
}

export async function require_roles(allowed: RolUsuario[]) {
  const db_user = await get_current_db_user();

  if (!db_user) {
    redirect("/login?error=Tu%20sesion%20no%20tiene%20usuario%20operativo%20asignado.");
  }

  if (!allowed.includes(db_user.rol)) {
    const fallback = get_role_fallback(db_user.rol);
    redirect(`${fallback}?error=Sin%20permisos%20para%20esta%20seccion.`);
  }

  return db_user;
}

export function can_cancel_sales(rol: RolUsuario | null | undefined) {
  return rol === "admin" || rol === "gerente";
}

export const ROL_LABELS: Record<RolUsuario, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  cajero: "Cajero",
  vendedor: "Vendedor",
};

export const ROL_COLORS: Record<RolUsuario, string> = {
  admin: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  gerente: "text-sky-300 bg-sky-400/10 border-sky-400/20",
  cajero: "text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20",
  vendedor: "text-slate-300 bg-slate-800 border-slate-700",
};
