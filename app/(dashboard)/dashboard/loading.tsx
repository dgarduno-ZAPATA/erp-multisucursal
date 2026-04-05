export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header + filtros */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="h-3 w-32 rounded-full bg-slate-200" />
            <div className="h-8 w-64 rounded-xl bg-slate-200" />
            <div className="h-4 w-96 rounded-full bg-slate-100" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 w-full rounded-2xl bg-slate-200" />
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="h-7 w-32 rounded-lg bg-slate-200" />
              <div className="h-3 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </section>

      {/* Gráfica de ventas */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="mb-4 space-y-2">
          <div className="h-4 w-40 rounded-full bg-slate-200" />
          <div className="h-3 w-64 rounded-full bg-slate-100" />
        </div>
        <div className="h-64 w-full rounded-2xl bg-slate-100" />
      </section>

      {/* Panel de metas */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="mb-5 space-y-2">
          <div className="h-4 w-40 rounded-full bg-slate-200" />
          <div className="h-3 w-52 rounded-full bg-slate-100" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-4 rounded-full bg-slate-200 shrink-0" />
              <div className="h-4 flex-1 rounded-full bg-slate-100" />
              <div className="h-4 w-16 rounded-full bg-slate-200" />
              <div className="h-4 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
