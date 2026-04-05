import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookie_store = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookie_store.getAll();
        },
        setAll(cookies_to_set) {
          try {
            cookies_to_set.forEach(({ name, value, options }) => {
              cookie_store.set(name, value, options);
            });
          } catch {
            // TODO: manejar escritura de cookies en acciones de servidor o route handlers.
          }
        },
      },
    },
  );
}
