import type { User } from "@supabase/supabase-js";

type UserRole = "admin" | "gerente" | "cajero" | "vendedor" | null;

function get_user_role(user: User | null): UserRole {
  if (!user) {
    return null;
  }

  const metadata_role =
    user.app_metadata.role ?? user.user_metadata.role ?? null;

  if (
    metadata_role === "admin" ||
    metadata_role === "gerente" ||
    metadata_role === "cajero" ||
    metadata_role === "vendedor"
  ) {
    return metadata_role;
  }

  // TODO: resolver roles desde la tabla usuarios cuando se integre Prisma/Supabase.
  return null;
}

export function is_admin(user: User | null): boolean {
  return get_user_role(user) === "admin";
}

export function is_vendedor(user: User | null): boolean {
  return get_user_role(user) === "vendedor";
}

export function is_cajero(user: User | null): boolean {
  return get_user_role(user) === "cajero";
}
