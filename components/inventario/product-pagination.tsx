type ProductPaginationProps = {
  page: number;
  total: number;
  page_size: number;
  base_href: string; // e.g. "/inventario?categoria=X&estado=activo"
};

export function ProductPagination({
  page,
  total,
  page_size,
  base_href,
}: ProductPaginationProps) {
  const total_pages = Math.ceil(total / page_size);
  if (total_pages <= 1) return null;

  const prev_page = page > 1 ? page - 1 : null;
  const next_page = page < total_pages ? page + 1 : null;

  const href_for = (p: number) =>
    base_href.includes("?")
      ? `${base_href}&page=${p}`
      : `${base_href}?page=${p}`;

  const start = (page - 1) * page_size + 1;
  const end = Math.min(page * page_size, total);

  return (
    <div className="flex items-center justify-between border-t border-white/10 px-2 py-4">
      <p className="text-sm text-slate-400">
        Mostrando{" "}
        <span className="font-semibold text-white">
          {start}–{end}
        </span>{" "}
        de{" "}
        <span className="font-semibold text-white">{total}</span> productos
      </p>

      <div className="flex items-center gap-2">
        {prev_page ? (
          <a
            href={href_for(prev_page)}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ← Anterior
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-white/5 px-4 py-2 text-sm font-semibold text-slate-600 cursor-not-allowed">
            ← Anterior
          </span>
        )}

        <span className="text-sm text-slate-400">
          {page} / {total_pages}
        </span>

        {next_page ? (
          <a
            href={href_for(next_page)}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Siguiente →
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-white/5 px-4 py-2 text-sm font-semibold text-slate-600 cursor-not-allowed">
            Siguiente →
          </span>
        )}
      </div>
    </div>
  );
}
