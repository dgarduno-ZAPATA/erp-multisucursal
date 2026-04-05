import { login_action } from "@/app/login/actions";
import { EnvironmentBadge } from "@/components/layout/environment-badge";

type LoginPageProps = {
  searchParams?: { error?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const error_message = searchParams?.error;

  return (
    <>
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes bar-glow {
          0%, 100% { opacity: 0.5; box-shadow: 0 0 0px #f59e0b; }
          50%       { opacity: 1;   box-shadow: 0 0 18px #f59e0b55; }
        }

        .anim-panel   { animation: fade-in  0.7s ease both; }
        .anim-header  { animation: fade-up  0.55s ease 0.1s both; }
        .anim-field-1 { animation: fade-up  0.5s  ease 0.2s both; }
        .anim-field-2 { animation: fade-up  0.5s  ease 0.3s both; }
        .anim-btn     { animation: fade-up  0.5s  ease 0.4s both; }
        .anim-footer  { animation: fade-up  0.5s  ease 0.52s both; }

        .dot-grid {
          background-image: radial-gradient(circle, #2c2c31 1px, transparent 1px);
          background-size: 26px 26px;
        }

        .input-underline {
          background: transparent;
          border: none;
          border-bottom: 1px solid #3f3f46;
          border-radius: 0;
          padding: 10px 0 10px 0;
          color: #fafaf9;
          width: 100%;
          outline: none;
          font-size: 0.925rem;
          letter-spacing: 0.01em;
          transition: border-color 0.18s;
          font-family: var(--font-dm), system-ui, sans-serif;
        }
        .input-underline::placeholder { color: #52525b; }
        .input-underline:focus        { border-color: #f59e0b; }

        .btn-amber {
          background: #f59e0b;
          color: #0c0c0e;
          transition: background 0.18s;
        }
        .btn-amber:hover { background: #fbbf24; }
      `}</style>

      <main className="min-h-screen flex" style={{ background: "#0c0c0e", color: "#fafaf9" }}>

        {/* ── LEFT PANEL ── */}
        <section
          className="anim-panel hidden lg:flex lg:w-[58%] xl:w-[56%] flex-col justify-between dot-grid relative"
          style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          {/* Amber accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0"
            style={{ width: "3px", background: "#f59e0b", animation: "bar-glow 4s ease-in-out infinite" }}
          />

          {/* Ghost watermark */}
          <div
            className="absolute bottom-10 right-6 select-none pointer-events-none leading-none"
            style={{
              fontFamily: "var(--font-syne), system-ui",
              fontSize: "clamp(90px, 11vw, 160px)",
              fontWeight: 800,
              color: "rgba(255,255,255,0.022)",
              letterSpacing: "-0.04em",
            }}
          >
            ERP
          </div>

          <div className="px-14 pt-12">
            {/* Brand pill */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#f59e0b" }}
              />
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-syne)", color: "#71717a", letterSpacing: "0.28em" }}
              >
                ERP Multi-Sucursal
              </span>
            </div>

            {/* Headline */}
            <h1
              className="mt-10 leading-[1.08] font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-syne)",
                fontSize: "clamp(2.1rem, 3.2vw, 3.4rem)",
              }}
            >
              Operación<br />
              centralizada.<br />
              <span style={{ color: "#f59e0b" }}>Resultados</span><br />
              en tiempo real.
            </h1>

            <p className="mt-6 text-sm leading-7 max-w-sm" style={{ color: "#71717a" }}>
              Panel administrativo y punto de venta unificados. Inventario,
              ventas y clientes desde una sola interfaz.
            </p>
          </div>

          {/* Feature cards */}
          <div className="px-14 pb-12 grid grid-cols-3 gap-3">
            {[
              { label: "Multi-sucursal", desc: "Control por sede" },
              { label: "POS integrado",  desc: "Caja directa"    },
              { label: "Análisis live",  desc: "KPIs al instante" },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-2xl p-4"
                style={{ border: "1px solid rgba(255,255,255,0.065)", background: "rgba(255,255,255,0.018)" }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ fontFamily: "var(--font-syne)", color: "rgba(245,158,11,0.75)" }}
                >
                  {f.label}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#52525b" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── RIGHT PANEL (form) ── */}
        <section
          className="flex-1 flex items-center justify-center px-8 py-14"
          style={{ background: "#111114" }}
        >
          <div className="w-full max-w-[370px]">

            {/* Mobile brand */}
            <div className="flex items-center gap-2.5 lg:hidden mb-10">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ fontFamily: "var(--font-syne)", color: "#71717a", letterSpacing: "0.28em" }}
              >
                ERP Multi-Sucursal
              </span>
              <EnvironmentBadge compact />
            </div>

            {/* Header */}
            <div className="anim-header">
              <div className="mb-4">
                <EnvironmentBadge />
              </div>
              <p
                className="text-[11px] font-semibold tracking-[0.26em] uppercase"
                style={{ fontFamily: "var(--font-syne)", color: "rgba(245,158,11,0.7)" }}
              >
                Bienvenido
              </p>
              <h2
                className="mt-3 text-4xl font-extrabold tracking-tight"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Acceso al sistema
              </h2>
              <p className="mt-3 text-sm leading-6" style={{ color: "#71717a" }}>
                Ingresa tus credenciales corporativas para continuar.
              </p>
            </div>

            {/* Error banner */}
            {error_message && (
              <div
                className="mt-6 rounded-xl px-4 py-3 text-sm"
                style={{
                  border: "1px solid rgba(244,63,94,0.2)",
                  background: "rgba(244,63,94,0.07)",
                  color: "#fda4af",
                }}
              >
                {error_message}
              </div>
            )}

            {/* Form */}
            <form action={login_action} className="mt-10 space-y-8">
              <div className="anim-field-1">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-semibold tracking-[0.22em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-syne)", color: "#52525b" }}
                >
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@empresa.com"
                  className="input-underline"
                  required
                />
              </div>

              <div className="anim-field-2">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold tracking-[0.22em] uppercase mb-3"
                  style={{ fontFamily: "var(--font-syne)", color: "#52525b" }}
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-underline"
                  required
                />
              </div>

              <button
                type="submit"
                className="anim-btn btn-amber w-full py-3.5 rounded-xl text-sm font-bold tracking-wide"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Entrar al sistema →
              </button>
            </form>

            {/* Footer note */}
            <p className="anim-footer mt-8 text-center text-xs" style={{ color: "#3f3f46" }}>
              Acceso restringido — solo personal autorizado
            </p>
          </div>
        </section>

      </main>
    </>
  );
}
