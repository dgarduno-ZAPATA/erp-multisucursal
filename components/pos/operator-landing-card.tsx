type OperatorLandingCardProps = {
  summary: {
    operador: {
      nombre: string;
      rol: string;
    };
    sucursal_actual: string;
    asistencia_activa: boolean;
    hora_entrada: string | null;
    horas_turno: number;
    ventas_hoy: number;
    tickets_hoy: number;
    ticket_promedio_hoy: number;
    ventas_semana: number;
    tickets_semana: number;
    faltantes_hoy: number;
    metas: {
      id: number;
      tipo: "sucursal" | "vendedor";
      nombre: string;
      monto_objetivo: number;
      monto_actual: number;
      porcentaje: number;
    }[];
  };
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const time_formatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});

export function OperatorLandingCard({ summary }: OperatorLandingCardProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-6 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.8)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
            Mi jornada
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {summary.operador.nombre}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {summary.operador.rol} en {summary.sucursal_actual}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {summary.asistencia_activa && summary.hora_entrada
              ? `Turno activo desde ${time_formatter.format(new Date(summary.hora_entrada))} · ${summary.horas_turno.toFixed(1)} h`
              : "Aun no registras un turno activo hoy."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <div className="text-slate-400">Semana actual</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-300">
            {currency_formatter.format(summary.ventas_semana)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {summary.tickets_semana} ticket{summary.tickets_semana === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ventas hoy</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {currency_formatter.format(summary.ventas_hoy)}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tickets hoy</p>
          <p className="mt-2 text-2xl font-semibold text-sky-300">{summary.tickets_hoy}</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ticket promedio</p>
          <p className="mt-2 text-2xl font-semibold text-violet-300">
            {currency_formatter.format(summary.ticket_promedio_hoy)}
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Faltantes hoy</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{summary.faltantes_hoy}</p>
        </article>
      </div>

      {summary.metas.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {summary.metas.map((meta) => (
            <article key={meta.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {meta.tipo === "vendedor" ? "Meta personal" : "Meta sucursal"}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">{meta.nombre}</p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-semibold text-emerald-300">
                    {currency_formatter.format(meta.monto_actual)}
                  </div>
                  <div className="text-xs text-slate-400">
                    de {currency_formatter.format(meta.monto_objetivo)}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full ${
                    meta.porcentaje >= 100 ? "bg-emerald-400" : meta.porcentaje >= 75 ? "bg-sky-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(meta.porcentaje, 0))}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-slate-300">{meta.porcentaje}% de avance</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
