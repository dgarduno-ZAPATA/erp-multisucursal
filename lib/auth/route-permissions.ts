import type { RolUsuario } from "@prisma/client";

export const ROUTE_PERMISSIONS: { pattern: string; roles: RolUsuario[] }[] = [
  { pattern: "/configuracion", roles: ["admin"] },
  { pattern: "/asistencias", roles: ["admin", "gerente"] },
  { pattern: "/clientes", roles: ["admin", "gerente"] },
  { pattern: "/dashboard", roles: ["admin", "gerente"] },
  { pattern: "/inventario", roles: ["admin", "gerente"] },
  { pattern: "/ventas", roles: ["admin", "gerente"] },
  { pattern: "/faltantes", roles: ["admin", "gerente", "cajero", "vendedor"] },
  { pattern: "/pos", roles: ["admin", "gerente", "cajero", "vendedor"] },
];

export function can_access(pathname: string, rol: string): boolean {
  for (const { pattern, roles } of ROUTE_PERMISSIONS) {
    if (pathname === pattern || pathname.startsWith(pattern + "/")) {
      return (roles as string[]).includes(rol);
    }
  }
  return true;
}
