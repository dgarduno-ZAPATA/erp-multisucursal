"use client";

import { useState, useMemo } from "react";

import { use_pos_store, type PosProduct } from "@/hooks/use-pos-store";

type ProductGridItem = {
  id: number;
  sku: string;
  nombre: string;
  categoria: string;
  imagenUrl: string | null;
  precio: number;
  estado: string;
  stock: number;
};

type ProductGridProps = {
  productos: ProductGridItem[];
};

const PAGE_SIZE = 24;

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function stock_color(stock: number) {
  if (stock <= 0) return "text-rose-400";
  if (stock <= 5) return "text-amber-400";
  return "text-emerald-400";
}

export function ProductGrid({ productos }: ProductGridProps) {
  const [query, set_query] = useState("");
  const [categoria, set_categoria] = useState("");
  const [page, set_page] = useState(1);
  const add_item = use_pos_store((state) => state.add_item);

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))).sort(),
    [productos],
  );

  const normalized = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let result = productos;
    if (normalized.length >= 2) {
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(normalized) ||
          p.sku.toLowerCase().includes(normalized) ||
          p.categoria.toLowerCase().includes(normalized),
      );
    }
    if (categoria) {
      result = result.filter((p) => p.categoria === categoria);
    }
    return result;
  }, [productos, normalized, categoria]);

  const total_pages = Math.ceil(visible.length / PAGE_SIZE);
  const paginated = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handle_query(value: string) {
    set_query(value);
    set_page(1);
  }

  function handle_categoria(value: string) {
    set_categoria(value);
    set_page(1);
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
            Catalogo rapido
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Productos listos para vender
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
          {visible.length} / {productos.length} producto{productos.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => handle_query(e.target.value)}
          placeholder="Buscar por nombre, SKU o categoría..."
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:bg-white/8 focus:ring-2 focus:ring-sky-400/10"
        />
        {categorias.length > 1 && (
          <select
            value={categoria}
            onChange={(e) => handle_categoria(e.target.value)}
            className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>
      {normalized.length === 1 && (
        <p className="mt-2 text-xs text-slate-500">Escribe al menos 2 caracteres para buscar.</p>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-sm text-slate-400">
          {productos.length === 0
            ? "No hay productos disponibles. Crea uno desde Inventario."
            : `Sin resultados para "${query}".`}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {paginated.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:border-sky-300/30 hover:bg-white/10"
              >
                {product.imagenUrl ? (
                  <img
                    src={product.imagenUrl}
                    alt={product.nombre}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-slate-900 text-slate-500">
                    <div className="flex flex-col items-center gap-2 text-sm">
                      <span className="text-2xl">[]</span>
                      <span>Sin imagen</span>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 inline-block">
                        {product.categoria}
                      </div>
                      <h3 className="mt-3 text-base font-semibold text-white leading-snug">
                        {product.nombre}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                      <p className={`mt-1 text-xs font-semibold ${stock_color(product.stock)}`}>
                        Stock: {product.stock}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Precio
                      </p>
                      <p className="mt-1 text-lg font-semibold text-emerald-300">
                        {currency_formatter.format(product.precio)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      add_item({
                        id: product.id,
                        sku: product.sku,
                        nombre: product.nombre,
                        precio: product.precio,
                        categoria: product.categoria,
                        stock_disponible: product.stock,
                      } satisfies PosProduct)
                    }
                    disabled={product.stock <= 0}
                    className={`mt-5 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      product.stock <= 0
                        ? "cursor-not-allowed bg-slate-700 text-slate-300 opacity-50"
                        : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                    }`}
                  >
                    {product.stock <= 0 ? "Agotado" : "Agregar al carrito"}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {total_pages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
              <p className="text-sm text-slate-400">
                Página{" "}
                <span className="font-semibold text-white">{page}</span>{" "}
                de{" "}
                <span className="font-semibold text-white">{total_pages}</span>
                {" · "}
                <span className="font-semibold text-white">{visible.length}</span> productos
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => set_page((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  onClick={() => set_page((p) => Math.min(total_pages, p + 1))}
                  disabled={page === total_pages}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
