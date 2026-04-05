"use client";

import { useState, useTransition } from "react";

import { createOrdenCompra } from "@/actions/ordenes-compra";

type Sucursal = { id: number; nombre: string };
type Producto = { id: number; nombre: string; sku: string };

type Props = {
  proveedor_id: number;
  sucursales: Sucursal[];
  productos: Producto[];
  monto_minimo?: number | null;
};

type Linea = { id: number; producto_id: number; cantidad: number; precio_unitario: number };

const INPUT =
  "rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

let next_id = 1;

export function CreateOrdenForm({ proveedor_id, sucursales, productos, monto_minimo }: Props) {
  const [open, setOpen] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([{ id: next_id++, producto_id: 0, cantidad: 1, precio_unitario: 0 }]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0);

  function add_linea() {
    setLineas((prev) => [...prev, { id: next_id++, producto_id: 0, cantidad: 1, precio_unitario: 0 }]);
  }

  function remove_linea(id: number) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function update_linea(id: number, field: keyof Omit<Linea, "id">, value: number) {
    setLineas((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sucursal_id = Number(fd.get("sucursal_id"));
    const fecha_esperada = String(fd.get("fecha_esperada") ?? "").trim() || undefined;
    const notas = String(fd.get("notas") ?? "").trim() || undefined;

    if (!sucursal_id) { setError("Selecciona una sucursal."); return; }
    if (lineas.some((l) => !l.producto_id)) { setError("Todos los productos deben estar seleccionados."); return; }
    if (lineas.some((l) => l.cantidad < 1)) { setError("Las cantidades deben ser mayores a cero."); return; }
    if (monto_minimo && total < monto_minimo) {
      setError(`El total (${currency.format(total)}) es menor al pedido mínimo (${currency.format(monto_minimo)}).`);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createOrdenCompra({
        proveedor_id,
        sucursal_id,
        fecha_esperada,
        notas,
        lineas: lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
        })),
      });
      if (!result.success) { setError(result.error); return; }
      setOpen(false);
      setLineas([{ id: next_id++, producto_id: 0, cantidad: 1, precio_unitario: 0 }]);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-300 transition hover:bg-sky-500/20"
      >
        + Nueva orden de compra
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Nueva orden de compra</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sucursal destino *
          </label>
          <select name="sucursal_id" className={INPUT} required>
            <option value="">Selecciona…</option>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Fecha esperada de entrega
          </label>
          <input name="fecha_esperada" type="date" className={INPUT} />
        </div>
      </div>

      {/* Líneas de productos */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Productos</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-3 text-left">Producto</th>
                <th className="pb-2 pr-3 text-left w-24">Cantidad</th>
                <th className="pb-2 pr-3 text-left w-32">Precio costo</th>
                <th className="pb-2 text-left w-28">Subtotal</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="space-y-2">
              {lineas.map((linea) => (
                <tr key={linea.id}>
                  <td className="pb-2 pr-3">
                    <select
                      value={linea.producto_id}
                      onChange={(e) => update_linea(linea.id, "producto_id", Number(e.target.value))}
                      className={INPUT}
                      required
                    >
                      <option value={0}>Selecciona…</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.sku})</option>
                      ))}
                    </select>
                  </td>
                  <td className="pb-2 pr-3">
                    <input
                      type="number"
                      min="1"
                      value={linea.cantidad}
                      onChange={(e) => update_linea(linea.id, "cantidad", Number(e.target.value))}
                      className={INPUT}
                    />
                  </td>
                  <td className="pb-2 pr-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={linea.precio_unitario}
                      onChange={(e) => update_linea(linea.id, "precio_unitario", Number(e.target.value))}
                      className={INPUT}
                    />
                  </td>
                  <td className="pb-2 pr-3 text-slate-300">
                    {currency.format(linea.cantidad * linea.precio_unitario)}
                  </td>
                  <td className="pb-2">
                    {lineas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove_linea(linea.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={add_linea}
          className="text-xs text-sky-400 hover:text-sky-300"
        >
          + Agregar producto
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <span className="text-sm text-slate-400">Total estimado</span>
        <span className="text-lg font-semibold text-white">{currency.format(total)}</span>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notas
        </label>
        <textarea
          name="notas"
          rows={2}
          placeholder="Observaciones del pedido…"
          className={`${INPUT} w-full resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Crear orden"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
