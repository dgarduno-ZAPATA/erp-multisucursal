import Link from "next/link";

import { get_conteo_productos } from "@/actions/conteo";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { ConteoForm } from "@/components/inventario/conteo-form";

type ConteoPageProps = {
  searchParams?: {
    sucursal_id?: string;
    ok?: string;
    error?: string;
  };
};

export default async function ConteoFisicoPage({ searchParams }: ConteoPageProps) {
  await require_roles(["admin", "gerente"]);

  const { sucursales } = await get_accessible_sucursales();
  const ok_count = searchParams?.ok ? Number(searchParams.ok) : null;
  const error_msg = searchParams?.error;

  // Determine active sucursal
  const sucursal_id_param = searchParams?.sucursal_id ? Number(searchParams.sucursal_id) : null;
  const active_sucursal =
    sucursal_id_param && sucursales.some((s) => s.id === sucursal_id_param)
      ? sucursal_id_param
      : sucursales[0]?.id ?? null;

  const productos = active_sucursal ? await get_conteo_productos(active_sucursal) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
              Inventario
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Conteo físico
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Ingresa el conteo real de cada producto. Solo se ajustan los que difieran del sistema.
              Los movimientos quedan registrados como &quot;Conteo físico&quot; en el historial.
            </p>
          </div>

          <Link
            href="/inventario"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al inventario
          </Link>
        </div>
      </section>

      {/* Feedback banners */}
      {ok_count !== null && ok_count === 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
          Conteo aplicado — sin diferencias detectadas. El inventario ya estaba correcto.
        </div>
      )}
      {ok_count !== null && ok_count > 0 && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
          {ok_count} ajuste{ok_count !== 1 ? "s" : ""} aplicado{ok_count !== 1 ? "s" : ""} correctamente.
          El historial de movimientos fue actualizado.
        </div>
      )}
      {error_msg && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-300">
          {decodeURIComponent(error_msg)}
        </div>
      )}

      {/* Selector de sucursal */}
      {sucursales.length > 1 && (
        <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
          <form className="flex flex-wrap items-center gap-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Sucursal
            </label>
            <div className="flex flex-wrap gap-2">
              {sucursales.map((s) => (
                <a
                  key={s.id}
                  href={`/inventario/conteo?sucursal_id=${s.id}`}
                  className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                    s.id === active_sucursal
                      ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                      : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  {s.nombre}
                </a>
              ))}
            </div>
          </form>
        </section>
      )}

      {/* Conteo form */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        {!active_sucursal ? (
          <p className="text-sm text-slate-400">
            No hay sucursales accesibles para tu cuenta.
          </p>
        ) : productos.length === 0 ? (
          <p className="text-sm text-slate-400">
            No hay productos con inventario en esta sucursal.
          </p>
        ) : (
          <ConteoForm productos={productos} sucursal_id={active_sucursal} />
        )}
      </section>
    </div>
  );
}
