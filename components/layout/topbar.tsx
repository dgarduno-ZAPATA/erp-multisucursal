import { logout_action } from "@/app/login/actions";
import { EnvironmentBadge } from "@/components/layout/environment-badge";

type TopbarProps = {
  title: string;
  description: string;
  branch_name: string;
  user_name: string;
  user_rol?: string;
};

export function Topbar({ title, description, branch_name, user_name, user_rol }: TopbarProps) {
  return (
    <header
      className="px-5 py-3 sm:px-8 xl:py-4"
      style={{
        background: "rgba(17,17,20,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Mobile/tablet: compact row */}
      <div className="flex items-center justify-between gap-3 pl-12 xl:hidden">
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold tracking-tight" style={{ color: "#fafaf9" }}>
            {title}
          </h1>
          <p className="truncate text-xs" style={{ color: "#52525b" }}>{branch_name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <EnvironmentBadge compact />
          <div
            className="hidden rounded-lg border px-3 py-1.5 sm:block"
            style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
          >
            <span className="text-xs font-medium" style={{ color: "#a1a1aa" }}>{user_name}</span>
            {user_rol && (
              <span
                className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}
              >
                {user_rol}
              </span>
            )}
          </div>
          <form action={logout_action}>
            <button
              type="submit"
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      {/* xl+: full layout */}
      <div className="hidden xl:flex xl:flex-row xl:items-center xl:justify-between xl:gap-6">
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: "#3f3f46" }}
          >
            Panel operativo
          </p>
          <h1
            className="mt-1.5 text-xl font-bold tracking-tight"
            style={{ color: "#fafaf9" }}
          >
            {title}
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-5" style={{ color: "#52525b" }}>
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <EnvironmentBadge />
          {/* Branch chip */}
          <div
            className="rounded-xl px-4 py-2.5"
            style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>
              Sucursal
            </div>
            <div className="mt-0.5 text-sm font-medium" style={{ color: "#a1a1aa" }}>
              {branch_name}
            </div>
          </div>

          {/* User chip */}
          <div
            className="rounded-xl px-4 py-2.5"
            style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>
              Usuario
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: "#a1a1aa" }}>{user_name}</span>
              {user_rol && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}
                >
                  {user_rol}
                </span>
              )}
            </div>
          </div>

          {/* Logout */}
          <form action={logout_action}>
            <button
              type="submit"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#71717a",
              }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
