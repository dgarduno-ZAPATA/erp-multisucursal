export default function InventarioLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <section className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.5)]">
        <div className="space-y-3 mb-6">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="h-8 w-48 rounded-xl bg-slate-200" />
          <div className="h-4 w-80 rounded-full bg-slate-100" />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="h-10 w-56 rounded-2xl bg-slate-200" />
          <div className="h-10 w-36 rounded-2xl bg-slate-200" />
          <div className="h-10 w-36 rounded-2xl bg-slate-200" />
          <div className="h-10 w-36 rounded-2xl bg-slate-200" />
          <div className="ml-auto h-10 w-32 rounded-2xl bg-slate-200" />
        </div>

        {/* Tabla */}
        <div className="rounded-2xl border border-slate-100 overflow-hidden">
          {/* Encabezado */}
          <div className="grid grid-cols-6 gap-4 bg-slate-50 px-4 py-3 border-b border-slate-100">
            {["Producto", "Categoría", "Stock", "Precio", "Costo", ""].map((_, i) => (
              <div key={i} className="h-3 rounded-full bg-slate-200" />
            ))}
          </div>
          {/* Filas */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-6 gap-4 px-4 py-4 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3 col-span-2">
                <div className="h-9 w-9 rounded-xl bg-slate-200 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-full rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="h-3 w-20 rounded-full bg-slate-100 self-center" />
              <div className="h-5 w-14 rounded-full bg-slate-200 self-center" />
              <div className="h-3 w-16 rounded-full bg-slate-100 self-center" />
              <div className="h-3 w-16 rounded-full bg-slate-100 self-center" />
            </div>
          ))}
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <div className="h-3 w-32 rounded-full bg-slate-100" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 w-8 rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
