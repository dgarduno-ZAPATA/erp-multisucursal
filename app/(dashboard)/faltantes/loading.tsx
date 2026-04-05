export default function FaltantesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="space-y-3 mb-6">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="h-8 w-36 rounded-xl bg-slate-200" />
          <div className="h-4 w-72 rounded-full bg-slate-100" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Board de faltantes */}
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-48 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-32 rounded-full bg-slate-100" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3 w-16 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-20 rounded-full bg-slate-100" />
                </div>
                <div className="h-8 w-24 rounded-xl bg-slate-200 shrink-0" />
              </div>
            ))}
          </div>

          {/* Ranking */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
            <div className="h-4 w-32 rounded-full bg-slate-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-100" />
                </div>
                <div className="h-3 w-12 rounded-full bg-slate-200 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
