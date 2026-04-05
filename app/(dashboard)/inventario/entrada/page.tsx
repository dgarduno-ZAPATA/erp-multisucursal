import Link from "next/link";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { EntradaEscaner } from "@/components/inventario/entrada-escaner";

export default async function EntradaMercanciaPage() {
  await require_roles(["admin", "gerente"]);

  const { sucursales } = await get_accessible_sucursales();

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
              Entrada de mercancía
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Escanea el código de barras del producto o ingrésalo manualmente.
              El stock se actualiza al instante y queda registrado en el historial.
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

      {/* Scanner */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        {sucursales.length === 0 ? (
          <p className="text-sm text-slate-400">
            No hay sucursales accesibles para tu cuenta.
          </p>
        ) : (
          <EntradaEscaner sucursales={sucursales} />
        )}
      </section>

      {/* Tips */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-400">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Cómo usar
        </p>
        <ol className="space-y-1.5">
          {[
            "Abre la cámara o usa un lector USB/Bluetooth conectado a la tablet.",
            "Escanea el código de barras del producto que llegó.",
            "Ingresa la cantidad recibida y opcionalmente el motivo.",
            "Toca Ingresar — el sistema actualiza el stock y lo registra en el historial.",
            "Escanea el siguiente producto sin recargar la página.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-[11px] font-semibold text-slate-500">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
