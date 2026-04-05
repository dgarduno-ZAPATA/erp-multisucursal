type ProductFiltersProps = {
  categorias: string[];
  categoria_actual: string;
  estado_actual: string;
  stock_actual: string;
  q_actual: string;
};

export function ProductFilters({
  categorias,
  categoria_actual,
  estado_actual,
  stock_actual,
  q_actual,
}: ProductFiltersProps) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-[20px] border border-white/10 bg-slate-950/60 px-5 py-4"
    >
      {/* Búsqueda por nombre / SKU */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Buscar
        </label>
        <input
          name="q"
          type="search"
          defaultValue={q_actual}
          placeholder="Nombre o SKU…"
          className="w-52 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
        />
      </div>

      {/* Categoría */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Categoría
        </label>
        <select
          name="categoria"
          defaultValue={categoria_actual}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
        >
          <option value="">Todas</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Estado activo/inactivo */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Estado
        </label>
        <select
          name="estado"
          defaultValue={estado_actual}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
        >
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      {/* Stock */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Stock
        </label>
        <select
          name="stock"
          defaultValue={stock_actual}
          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
        >
          <option value="">Todos</option>
          <option value="agotado">Agotado</option>
          <option value="en_riesgo">En riesgo</option>
          <option value="normal">Normal</option>
        </select>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
      >
        Filtrar
      </button>

      <a
        href="/inventario"
        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Limpiar
      </a>
    </form>
  );
}
