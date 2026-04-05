"use client";

import { useState, useTransition } from "react";

import { registrarPago } from "@/actions/ordenes-compra";

type Props = {
  orden_id: number;
  folio: string;
  saldo: number;
  onClose: () => void;
};

const INPUT =
  "rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function RegistrarPagoForm({ orden_id, folio, saldo, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("orden_id", String(orden_id));
    setError(null);
    startTransition(async () => {
      const result = await registrarPago(fd);
      if (!result.success) { setError(result.error); return; }
      onClose();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-200/70">Pago</p>
          <h3 className="mt-1 text-base font-semibold text-white">{folio}</h3>
        </div>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        Saldo pendiente: <strong>{currency.format(saldo)}</strong>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Monto a pagar *
        </label>
        <input
          name="monto"
          type="number"
          min="0.01"
          step="0.01"
          max={saldo}
          placeholder={`Máx. ${currency.format(saldo)}`}
          className={INPUT}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Método de pago
        </label>
        <select name="metodo_pago" className={INPUT}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Notas (opcional)
        </label>
        <input name="notas" placeholder="Referencia de transferencia, cheque, etc." className={INPUT} />
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
          className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
        >
          {isPending ? "Registrando…" : "Registrar pago"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-400 hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
