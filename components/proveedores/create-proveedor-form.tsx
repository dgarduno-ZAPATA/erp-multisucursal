"use client";

import { useState, useTransition } from "react";

import { createProveedor } from "@/actions/proveedores";

const INPUT =
  "rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20";
const LABEL = "block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1";

export function CreateProveedorForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createProveedor(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      (document.getElementById("create-proveedor-form") as HTMLFormElement | null)?.reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <form
      id="create-proveedor-form"
      action={handleSubmit}
      className="grid gap-5 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Proveedores
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Nuevo proveedor</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Registra los datos del proveedor, sus condiciones comerciales y frecuencia de visita.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={LABEL}>Nombre *</label>
          <input name="nombre" placeholder="Distribuidora Naturista S.A." className={INPUT} required />
        </div>
        <div>
          <label className={LABEL}>Representante / Contacto</label>
          <input name="contacto" placeholder="Nombre del vendedor" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Teléfono</label>
          <input name="telefono" type="tel" placeholder="55 1234 5678" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input name="email" type="email" placeholder="ventas@proveedor.com" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Dirección</label>
          <input name="direccion" placeholder="Ciudad, Estado" className={INPUT} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Días de crédito</label>
          <input
            name="dias_credito"
            type="number"
            min="0"
            placeholder="30"
            defaultValue="0"
            className={INPUT}
          />
          <p className="mt-1 text-xs text-slate-500">0 = pago al contado</p>
        </div>
        <div>
          <label className={LABEL}>Visita cada (días)</label>
          <input
            name="frecuencia_visita"
            type="number"
            min="1"
            placeholder="7"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Próxima visita</label>
          <input name="proxima_visita" type="date" className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Pedido mínimo (MXN)</label>
          <input
            name="monto_minimo_pedido"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Notas internas</label>
        <textarea
          name="notas"
          rows={2}
          placeholder="Condiciones especiales, horarios, etc."
          className={`${INPUT} w-full resize-none`}
        />
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Proveedor registrado correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar proveedor"}
      </button>
    </form>
  );
}
