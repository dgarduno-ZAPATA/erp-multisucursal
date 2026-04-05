"use client";

import { useQuery } from "@tanstack/react-query";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";

async function get_current_user(): Promise<SessionUser | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    nombre:
      typeof user.user_metadata.nombre === "string"
        ? user.user_metadata.nombre
        : null,
    rol:
      user.app_metadata.role === "admin" ||
      user.app_metadata.role === "gerente" ||
      user.app_metadata.role === "cajero" ||
      user.app_metadata.role === "vendedor"
        ? user.app_metadata.role
        : user.user_metadata.rol === "admin" ||
            user.user_metadata.rol === "gerente" ||
            user.user_metadata.rol === "cajero" ||
            user.user_metadata.rol === "vendedor"
          ? user.user_metadata.rol
        : null,
    sucursal_id:
      typeof user.user_metadata.sucursal_id === "number"
        ? user.user_metadata.sucursal_id
        : null,
  };
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: get_current_user,
  });
}
