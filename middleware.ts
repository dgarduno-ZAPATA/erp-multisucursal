import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { can_access } from "@/lib/auth/route-permissions";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies_to_set) {
          cookies_to_set.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Auth guard ───────────────────────────────────────────────────────────
  const protected_prefixes = ["/dashboard", "/pos", "/inventario", "/ventas", "/asistencias", "/faltantes", "/clientes", "/configuracion"];
  const is_protected = protected_prefixes.some((p) => pathname.startsWith(p));

  if (!user && is_protected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Debes iniciar sesion para continuar.");
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const rol = (user.user_metadata?.rol as string | undefined) ?? "vendedor";
    const target = rol === "vendedor" || rol === "cajero" ? "/pos" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // ── RBAC guard ───────────────────────────────────────────────────────────
  // Role is read from Supabase user_metadata for Edge-compatible fast check.
  // Critical server actions perform a secondary Prisma DB check.
  if (user && is_protected) {
    const rol = (user.user_metadata?.rol as string | undefined) ?? "vendedor";

    if (!can_access(pathname, rol)) {
      // Redirect to the highest-access route for this role
      const fallback = rol === "vendedor" || rol === "cajero" ? "/pos" : "/dashboard";
      const url = new URL(fallback, request.url);
      url.searchParams.set("error", "Sin+permisos+para+esta+seccion.");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)"],
};
