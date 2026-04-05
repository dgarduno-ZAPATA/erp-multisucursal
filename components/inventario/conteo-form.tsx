"use client";

import { useState, useMemo } from "react";

import { ejecutar_conteo_fisico } from "@/actions/conteo";
import type { ConteoProducto } from "@/actions/conteo";

type Props = {
  productos: ConteoProducto[];
  sucursal_id: number;
};

type FilaConteo = ConteoProducto & { fisico: string };

export function ConteoForm({ productos, sucursal_id }: Props) {
  const [filas, set_filas] = useState<FilaConteo[]>(
    productos.map((p) => ({ ...p, fisico: "" })),
  );
  const [filtro, set_filtro] = useState("");

  function handle_change(inventario_id: number, value: string) {
    set_filas((prev) =>
      prev.map((f) => (f.inventario_id === inventario_id ? { ...f, fisico: value } : f)),
    );
  }

  const filas_filtradas = useMemo(() => {
    const q = filtro.toLowerCase();
    if (!q) return filas;
    return filas.filter(
      (f) =>
        f.nombre.toLowerCase().includes(q) ||
        f.sku.toLowerCase().includes(q) ||
        f.categoria.toLowerCase().includes(q),
    );
  }, [filas, filtro]);

  const discrepancias = useMemo(
    () =>
      filas.filter((f) => {
        if (f.fisico === "" || f.fisico === "-") return false;
        const n = Number(f.fisico);
        return Number.isFinite(n) && n >= 0 && n !== f.stock_sistema;
      }),
    [filas],
  );

  const contados = filas.filter((f) => f.fisico !== "").length;

  function diff_class(f: FilaConteo) {
    if (f.fisico === "") return "";
    const n = Number(f.fisico);
    if (!Number.isFinite(n) || n < 0) return "text-rose-400";
    if (n === f.stock_sistema) return "text-emerald-400";
    return Math.abs(n - f.stock_sistema) <= 2 ? "text-amber-300" : "text-rose-400";
  }

  function row_class(f: FilaConteo) {
    if (f.fisico === "") return "border-white/5 hover:bg-white/[0.03]";
    const n = Number(f.fisico);
    if (!Number.isFinite(n) || n < 0) return "border-rose-500/20 bg-rose-500/5";
    if (n === f.stock_sistema) return "border-emerald-500/10 bg-emerald-500/5";
    return "border-amber-400/20 bg-amber-400/5";
  }

  return (
    <form action={ejecutar_conteo_fisico} className="space-y-5">
      <input type="hidden" name="sucursal_id" value={sucursal_id} />

      {/* Barra de progreso + filtro */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-sky-400 transition-all"
              style={{ width: `${Math.round((contados / Math.max(filas.length, 1)) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {contados} / {filas.length} contados
          </span>
          {discrepancias.length > 0 && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              {discrepancias.length} diferencia{discrepancias.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <input
          type="text"
          placeholder="Buscar producto o SKU..."
          value={filtro}
          onChange={(e) => set_filtro(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10 sm:w-64"
        />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
              <th className="px-4 py-3 font-semibold">Producto</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold text-right">Sistema</th>
              <th className="px-4 py-3 font-semibold text-center">Conteo</th>
              <th className="px-4 py-3 font-semibold text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {filas_filtradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                  Sin productos para el filtro actual.
                </td>
              </tr>
            ) : (
              filas_filtradas.map((f) => {
                const n = f.fisico !== "" ? Number(f.fisico) : null;
                const diff = n !== null && Number.isFinite(n) ? n - f.stock_sistema : null;
                return (
                  <tr key={f.inventario_id} className={`border-b last:border-0 transition ${row_class(f)}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{f.nombre}</div>
                      <div className="text-xs text-slate-500">{f.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{f.categoria}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          f.stock_sistema <= 0
                            ? "text-rose-400"
                            : f.stock_sistema <= f.stock_minimo
                              ? "text-amber-300"
                              : "text-slate-200"
                        }`}
                      >
                        {f.stock_sistema}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        name={`conteo_${f.inventario_id}`}
                        min="0"
                        step="1"
                        value={f.fisico}
                        onChange={(e) => handle_change(f.inventario_id, e.target.value)}
                        placeholder="—"
                        className="w-20 rounded-xl border border-white/10 bg-slate-800 px-3 py-1.5 text-center text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${diff_class(f)}`}>
                      {diff === null
                        ? "—"
                        : diff === 0
                          ? "✓"
                          : diff > 0
                            ? `+${diff}`
                            : String(diff)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Resumen de diferencias */}
      {discrepancias.length > 0 && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/80">
            Diferencias que se ajustarán
          </p>
          <div className="space-y-1.5">
            {discrepancias.map((f) => {
              const n = Number(f.fisico);
              const diff = n - f.stock_sistema;
              return (
                <div key={f.inventario_id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{f.nombre}</span>
                  <span className={`font-semibold ${diff > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {f.stock_sistema} → {n} ({diff > 0 ? "+" : ""}{diff})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-500">
          Solo se actualizan productos donde el conteo físico difiera del sistema.
        </p>
        <button
          type="submit"
          disabled={discrepancias.length === 0}
          className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Aplicar {discrepancias.length > 0 ? `${discrepancias.length} ajuste${discrepancias.length !== 1 ? "s" : ""}` : "conteo"}
        </button>
      </div>
    </form>
  );
}
