import { createMetaVenta } from "@/actions/metas";

type GoalsPanelProps = {
  fecha_desde: string;
  fecha_hasta: string;
  sucursales: {
    id: number;
    nombre: string;
    codigo: string;
  }[];
  operadores: {
    id: string;
    nombre: string;
    rol: string;
    sucursal: string;
  }[];
  resumen: {
    total_objetivo: number;
    total_actual: number;
    metas_activas: number;
    metas_cumplidas: number;
    metas_semanales: number;
    metas_mensuales: number;
    criticas: number;
    cumplimiento_promedio: number;
  };
  metas: {
    id: number;
    nombre: string;
    tipo: "sucursal" | "vendedor";
    fecha_inicio: string;
    fecha_fin: string;
    monto_objetivo: number;
    monto_actual: number;
    porcentaje: number;
    tickets: number;
    cadencia: "semanal" | "mensual" | "personalizada";
    estatus: "cumplida" | "en_riesgo_bajo" | "en_riesgo_medio" | "critica";
    faltante: number;
    usuario_nombre: string | null;
    usuario_rol: string | null;
    sucursal_nombre: string | null;
  }[];
  ranking: {
    id: number;
    nombre: string;
    tipo: "sucursal" | "vendedor";
    porcentaje: number;
    monto_actual: number;
    monto_objetivo: number;
    estatus: "cumplida" | "en_riesgo_bajo" | "en_riesgo_medio" | "critica";
  }[];
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

async function submit_goal_action(form_data: FormData) {
  "use server";

  await createMetaVenta(form_data);
}

export function GoalsPanel({
  fecha_desde,
  fecha_hasta,
  sucursales,
  operadores,
  resumen,
  metas,
  ranking,
}: GoalsPanelProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Metas comerciales
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Objetivos por sucursal y operador
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Crea metas para seguimiento gerencial y mide el avance real contra el periodo activo.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Objetivo total</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">
              {currency_formatter.format(resumen.total_objetivo)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Avance total</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {currency_formatter.format(resumen.total_actual)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas activas</div>
            <div className="mt-2 text-2xl font-semibold text-sky-700">{resumen.metas_activas}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas cumplidas</div>
            <div className="mt-2 text-2xl font-semibold text-amber-700">{resumen.metas_cumplidas}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Cumplimiento promedio</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{resumen.cumplimiento_promedio}%</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas semanales</div>
            <div className="mt-2 text-2xl font-semibold text-sky-700">{resumen.metas_semanales}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas mensuales</div>
            <div className="mt-2 text-2xl font-semibold text-violet-700">{resumen.metas_mensuales}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Metas criticas</div>
            <div className="mt-2 text-2xl font-semibold text-rose-700">{resumen.criticas}</div>
          </div>
        </div>

        <form action={submit_goal_action} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              name="tipo"
              defaultValue="sucursal"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            >
              <option value="sucursal">Meta por sucursal</option>
              <option value="vendedor">Meta por vendedor/cajero</option>
            </select>
            <input
              type="number"
              name="monto_objetivo"
              min="0"
              step="0.01"
              placeholder="Monto objetivo"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
              required
            />
          </div>
          <input
            type="text"
            name="nombre"
            placeholder="Nombre opcional para la meta"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              name="fecha_inicio"
              defaultValue={fecha_desde}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
              required
            />
            <input
              type="date"
              name="fecha_fin"
              defaultValue={fecha_hasta}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
              required
            />
          </div>
          <select
            name="sucursal_id"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
          >
            <option value="">Selecciona sucursal si la meta es por sucursal</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre} | {sucursal.codigo}
              </option>
            ))}
          </select>
          <select
            name="usuario_id"
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
          >
            <option value="">Selecciona operador si la meta es por vendedor/cajero</option>
            {operadores.map((operador) => (
              <option key={operador.id} value={operador.id}>
                {operador.nombre} | {operador.rol} | {operador.sucursal}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Crear meta
          </button>
        </form>
      </article>

      <article className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Ranking
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Cumplimiento lider
        </h2>
        <div className="mt-5 space-y-3">
          {ranking.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Sin metas suficientes para ranking.
            </div>
          ) : (
            ranking.map((meta, index) => (
              <div key={meta.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-400">#{index + 1}</div>
                    <div className="font-semibold text-slate-950">{meta.nombre}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-950">{meta.porcentaje}%</div>
                    <div className="text-xs text-slate-400">
                      {currency_formatter.format(meta.monto_actual)} de {currency_formatter.format(meta.monto_objetivo)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Seguimiento
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Avance de metas activas
        </h2>
        <div className="mt-5 space-y-4">
          {metas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Todavia no hay metas activas en el rango actual.
            </div>
          ) : (
            metas.map((meta) => (
              <div key={meta.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">{meta.nombre}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-400">
                      {meta.tipo === "vendedor" ? meta.usuario_rol : "Sucursal"} | {meta.cadencia}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {meta.usuario_nombre ?? meta.sucursal_nombre ?? "Sin referencia"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {meta.fecha_inicio} a {meta.fecha_fin} | {meta.tickets} ticket{meta.tickets === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-950">
                      {currency_formatter.format(meta.monto_actual)}
                    </div>
                    <div className="text-xs text-slate-400">
                      meta {currency_formatter.format(meta.monto_objetivo)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${
                      meta.estatus === "cumplida"
                        ? "bg-emerald-400"
                        : meta.estatus === "en_riesgo_bajo"
                          ? "bg-sky-400"
                          : meta.estatus === "en_riesgo_medio"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(meta.porcentaje, 0))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-600">{meta.porcentaje}% de avance</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      meta.estatus === "cumplida"
                        ? "bg-emerald-100 text-emerald-700"
                        : meta.estatus === "en_riesgo_bajo"
                          ? "bg-sky-100 text-sky-700"
                          : meta.estatus === "en_riesgo_medio"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {meta.estatus === "cumplida"
                      ? "Cumplida"
                      : meta.estatus === "en_riesgo_bajo"
                        ? "Saludable"
                        : meta.estatus === "en_riesgo_medio"
                          ? "Vigilancia"
                          : "Critica"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Faltante para cumplir: {currency_formatter.format(meta.faltante)}
                </div>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
