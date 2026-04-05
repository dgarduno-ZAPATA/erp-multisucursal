export default function VentasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="space-y-3 mb-6">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="h-8 w-40 rounded-xl bg-slate-200" />
          <div className="h-4 w-72 rounded-full bg-slate-100" />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="h-10 w-44 rounded-2xl bg-slate-200" />
          <div className="h-10 w-36 rounded-2xl bg-slate-200" />
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-6 gap-4 bg-slate-50 px-4 py-3 border-b border-slate-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 rounded-full bg-slate-200" />
            ))}
          </div>
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-50 last:border-0 items-center"
            >
              <div className="h-3 w-20 rounded-full bg-slate-200" />
              <div className="h-3 w-28 rounded-full bg-slate-100" />
              <div className="h-5 w-20 rounded-full bg-slate-200" />
              <div className="h-3 w-16 rounded-full bg-slate-100" />
              <div className="h-3 w-24 rounded-full bg-slate-100" />
              <div className="h-7 w-20 rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
