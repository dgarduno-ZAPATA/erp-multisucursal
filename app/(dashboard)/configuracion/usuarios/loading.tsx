export default function ConfiguracionUsuariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="space-y-3 mb-8">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="h-8 w-48 rounded-xl bg-slate-200" />
          <div className="h-4 w-80 rounded-full bg-slate-100" />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Lista de usuarios por rol */}
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, group) => (
              <div key={group} className="space-y-3">
                <div className="h-5 w-24 rounded-full bg-slate-200" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-100 p-4 flex items-center gap-4"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-36 rounded-full bg-slate-200" />
                      <div className="h-2.5 w-24 rounded-full bg-slate-100" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-slate-200" />
                    <div className="flex gap-2">
                      <div className="h-8 w-16 rounded-xl bg-slate-200" />
                      <div className="h-8 w-16 rounded-xl bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Formulario lateral */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 space-y-4">
            <div className="h-5 w-32 rounded-full bg-slate-200" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-20 rounded-full bg-slate-200" />
                <div className="h-10 w-full rounded-2xl bg-slate-200" />
              </div>
            ))}
            <div className="h-10 w-full rounded-2xl bg-slate-300" />
          </div>
        </div>
      </section>
    </div>
  );
}
