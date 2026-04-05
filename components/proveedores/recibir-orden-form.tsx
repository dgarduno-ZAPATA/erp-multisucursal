"use client";

import { useState, useTransition } from "react";

import { recibirOrden, cancelarOrden } from "@/actions/ordenes-compra";

type DetalleLinea = {
  id: number;
  producto_id: number;
  cantidad_pedida: number;
  cantidad_recibida: number;
  precio_unitario: number;
  producto: { nombre: string; sku: string };
};

type Props = {
  orden_id: number;
  folio: string;
  proveedor_nombre: string;
  detalle: DetalleLinea[];
  onClose: () => void;
};

const INPUT =
  "w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function RecibirOrdenForm({ orden_id, folio, proveedor_nombre, detalle, onClose }: Props) {
  const [recepciones, setRecepciones] = useState(
    detalle.map((d) => ({
      detalle_id: d.id,
      cantidad_recibida: d.cantidad_pedida - d.cantidad_recibida,
      precio_unitario: d.precio_unitario,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(detalle_id: number, field: "cantidad_recibida" | "precio_unitario", value: number) {
    setRecepciones((prev) =>
      prev.map((r) => (r.detalle_id === detalle_id ? { ...r, [field]: value } : r)),
    );
  }

  function handleRecibir() {
    setError(null);
    const lineas = recepciones.filter((r) => r.cantidad_recibida > 0);
    if (!lineas.length) { setError("Ingresa al menos una cantidad recibida."); return; }
    startTransition(async () => {
      const result = await recibirOrden(orden_id, lineas);
      if (!result.success) { setError(result.error); return; }
      onClose();
    });
  }

  function handleCancelar() {
    startTransition(async () => {
      const result = await cancelarOrden(orden_id);
      if (!result.success) { setError(result.error); return; }
      onClose();
    });
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/70">
            Recepción de mercancía
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            {folio} · {proveedor_nombre}
          </h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
              <th className="pb-2 pr-4 text-left">Producto</th>
              <th className="pb-2 pr-4 text-left w-20">Pedido</th>
              <th className="pb-2 pr-4 text-left w-24">Recibido</th>
              <th className="pb-2 text-left w-32">Precio costo</th>
            </tr>
          </thead>
          <tbody>
            {detalle.map((d) => {
              const rec = recepciones.find((r) => r.detalle_id === d.id)!;
              const pendiente = d.cantidad_pedida - d.cantidad_recibida;
              return (
                <tr key={d.id} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{d.producto.nombre}</p>
                    <p className="text-xs text-slate-400">{d.producto.sku}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-300">{pendiente} pzas</td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      min="0"
                      max={pendiente}
                      value={rec.cantidad_recibida}
                      onChange={(e) => update(d.id, "cantidad_recibida", Number(e.target.value))}
                      className={INPUT}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rec.precio_unitario}
                      onChange={(e) => update(d.id, "precio_unitario", Number(e.target.value))}
                      className={INPUT}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-xs text-slate-400">
          Si el precio ingresado difiere del registrado, se guardará automáticamente en el historial de precios.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleRecibir}
          disabled={isPending}
          className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
        >
          {isPending ? "Procesando…" : "Confirmar recepción"}
        </button>
        <button
          onClick={onClose}
          disabled={isPending}
          className="rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-400 hover:text-white disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleCancelar}
          disabled={isPending}
          className="ml-auto rounded-2xl border border-rose-500/30 px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
        >
          Cancelar orden
        </button>
      </div>
    </div>
  );
}
