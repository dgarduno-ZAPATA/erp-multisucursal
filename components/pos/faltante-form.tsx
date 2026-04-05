"use client";

import { useState, useTransition } from "react";

import { crearFaltante } from "@/actions/faltantes";

type ProductOption = {
  id: number;
  nombre: string;
  sku: string;
};

type FaltanteFormProps = {
  productos: ProductOption[];
};

export function FaltanteForm({ productos }: FaltanteFormProps) {
  const [is_open, set_is_open] = useState(false);
  const [query, set_query] = useState("");
  const [selected_id, set_selected_id] = useState<number | null>(null);
  const [cantidad, set_cantidad] = useState("1");
  const [motivo, set_motivo] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [success, set_success] = useState(false);
  const [is_pending, start_transition] = useTransition();

  const normalized = query.trim().toLowerCase();
  const filtered =
    normalized.length < 2
      ? []
      : productos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(normalized) ||
            p.sku.toLowerCase().includes(normalized),
        ).slice(0, 6);

  const selected_product = productos.find((p) => p.id === selected_id) ?? null;

  function handle_reset() {
    set_query("");
    set_selected_id(null);
    set_cantidad("1");
    set_motivo("");
    set_error(null);
    set_success(false);
  }

  function handle_close() {
    set_is_open(false);
    handle_reset();
  }

  function handle_submit() {
    if (!selected_id) {
      set_error("Selecciona un producto.");
      return;
    }
    const cant = Number(cantidad);
    if (!Number.isInteger(cant) || cant <= 0) {
      set_error("La cantidad debe ser mayor a 0.");
      return;
    }

    set_error(null);
    start_transition(async () => {
      const fd = new FormData();
      fd.set("producto_id", String(selected_id));
      fd.set("cantidad_faltante", String(cant));
      if (motivo.trim()) fd.set("motivo", motivo.trim());

      const result = await crearFaltante(fd);
      if (!result.success) {
        set_error(result.error ?? "Error al registrar el faltante.");
        return;
      }
      set_success(true);
      setTimeout(handle_close, 1200);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => set_is_open(true)}
        className="inline-flex items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-400/20"
      >
        Reportar faltante
      </button>

      {is_open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  POS
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Reportar faltante
                </h2>
              </div>
              <button
                type="button"
                onClick={handle_close}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center text-sm font-semibold text-emerald-300">
                Faltante registrado correctamente.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {error && (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                {/* Búsqueda de producto */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Producto
                  </label>
                  {selected_product ? (
                    <div className="mt-2 flex items-center justify-between rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{selected_product.nombre}</p>
                        <p className="text-xs text-slate-400">{selected_product.sku}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { set_selected_id(null); set_query(""); }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="relative mt-2">
                      <input
                        type="search"
                        value={query}
                        onChange={(e) => set_query(e.target.value)}
                        placeholder="Buscar por nombre o SKU..."
                        className="w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
                      />
                      {filtered.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
                          {filtered.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  set_selected_id(p.id);
                                  set_query(p.nombre);
                                }}
                                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-white/10"
                              >
                                <span className="font-medium text-white">{p.nombre}</span>
                                <span className="text-xs text-slate-500">{p.sku}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {normalized.length === 1 && (
                        <p className="mt-1 text-xs text-slate-600">Escribe al menos 2 caracteres.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Cantidad */}
                <div>
                  <label htmlFor="faltante_cantidad" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Cantidad faltante
                  </label>
                  <input
                    id="faltante_cantidad"
                    type="number"
                    min="1"
                    step="1"
                    value={cantidad}
                    onChange={(e) => set_cantidad(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
                  />
                </div>

                {/* Motivo (opcional) */}
                <div>
                  <label htmlFor="faltante_motivo" className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Motivo <span className="normal-case text-slate-600">(opcional)</span>
                  </label>
                  <input
                    id="faltante_motivo"
                    type="text"
                    value={motivo}
                    onChange={(e) => set_motivo(e.target.value)}
                    placeholder="Cliente preguntó por talla L..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handle_close}
                    className="flex-1 rounded-2xl border border-slate-700 bg-transparent py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handle_submit}
                    disabled={!selected_id || is_pending}
                    className="flex-1 rounded-2xl bg-rose-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {is_pending ? "Guardando..." : "Registrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
