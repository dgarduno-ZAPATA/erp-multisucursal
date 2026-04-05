"use client";

import { useState, useTransition } from "react";

import { asignarProducto, desasignarProducto } from "@/actions/proveedores";

type Producto = { id: number; nombre: string; sku: string; categoria: string };
type ProductoAsignado = {
  producto_id: number;
  precio_costo: number | null;
  es_principal: boolean;
  producto: Producto;
};

type Props = {
  proveedor_id: number;
  productos_catalogo: Producto[];
  productos_asignados: ProductoAsignado[];
};

const INPUT =
  "rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function AsignarProductoForm({ proveedor_id, productos_catalogo, productos_asignados }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const asignados_ids = new Set(productos_asignados.map((p) => p.producto_id));
  const disponibles = productos_catalogo.filter((p) => !asignados_ids.has(p.id));

  function handleAsignar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const producto_id = Number(fd.get("producto_id"));
    const precio = fd.get("precio_costo") ? Number(fd.get("precio_costo")) : null;
    const es_principal = fd.get("es_principal") === "on";

    if (!producto_id) { setError("Selecciona un producto."); return; }

    setError(null);
    startTransition(async () => {
      const result = await asignarProducto(proveedor_id, producto_id, precio, es_principal);
      if (!result.success) { setError("Error al asignar."); return; }
      (e.target as HTMLFormElement).reset();
      setOpen(false);
    });
  }

  function handleDesasignar(producto_id: number) {
    startTransition(async () => {
      await desasignarProducto(proveedor_id, producto_id);
    });
  }

  return (
    <div className="space-y-4">
      {/* Lista de asignados */}
      {productos_asignados.length === 0 ? (
        <p className="text-sm text-slate-400">Este proveedor aún no tiene productos asignados.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-xs uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio costo</th>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {productos_asignados.map((p) => (
                <tr key={p.producto_id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{p.producto.nombre}</td>
                  <td className="px-4 py-3 text-slate-400">{p.producto.sku}</td>
                  <td className="px-4 py-3 text-slate-400">{p.producto.categoria}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {p.precio_costo !== null ? currency.format(p.precio_costo) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.es_principal ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                        Sí
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDesasignar(p.producto_id)}
                      disabled={isPending}
                      className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Botón agregar */}
      {!open && disponibles.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-300 transition hover:bg-sky-500/20"
        >
          + Asignar producto
        </button>
      )}

      {/* Form inline */}
      {open && (
        <form
          onSubmit={handleAsignar}
          className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 sm:grid-cols-4"
        >
          <div className="sm:col-span-2">
            <select name="producto_id" className={INPUT} required>
              <option value="">Selecciona producto…</option>
              {disponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.sku})
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              name="precio_costo"
              type="number"
              min="0"
              step="0.01"
              placeholder="Precio costo"
              className={INPUT}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="es_principal" className="accent-sky-400" />
              Principal
            </label>
          </div>
          {error && <p className="sm:col-span-4 text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2 sm:col-span-4">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
            >
              Asignar
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); }}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
