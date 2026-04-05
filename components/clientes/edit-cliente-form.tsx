"use client";

import { useState, useTransition } from "react";

import { updateCliente } from "@/actions/clientes";
import type { ClienteDetalle } from "@/actions/clientes";

type EditClienteFormProps = {
  cliente: ClienteDetalle;
};

export function EditClienteForm({ cliente }: EditClienteFormProps) {
  const [is_open, set_is_open] = useState(false);
  const [error, set_error] = useState<string | null>(null);
  const [success, set_success] = useState(false);
  const [is_pending, start_transition] = useTransition();

  function handle_submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    set_error(null);
    set_success(false);
    const fd = new FormData(e.currentTarget);
    start_transition(async () => {
      const result = await updateCliente(cliente.id, fd);
      if (!result.success) {
        set_error(result.error);
        return;
      }
      set_success(true);
      setTimeout(() => {
        set_is_open(false);
        set_success(false);
      }, 1000);
    });
  }

  if (!is_open) {
    return (
      <button
        type="button"
        onClick={() => set_is_open(true)}
        className="rounded-2xl border border-slate-700 bg-transparent px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
      >
        Editar
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-800/60 p-5">
      <h3 className="text-sm font-semibold text-white">Editar cliente</h3>

      {error && (
        <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          Datos actualizados.
        </p>
      )}

      <form onSubmit={handle_submit} className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Nombre *
          </label>
          <input
            name="nombre"
            type="text"
            required
            defaultValue={cliente.nombre}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={cliente.email ?? ""}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Teléfono
            </label>
            <input
              name="telefono"
              type="tel"
              defaultValue={cliente.telefono ?? ""}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Dirección
          </label>
          <input
            name="direccion"
            type="text"
            defaultValue={cliente.direccion ?? ""}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { set_is_open(false); set_error(null); }}
            className="flex-1 rounded-xl border border-slate-700 bg-transparent py-2.5 text-sm font-semibold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={is_pending}
            className="flex-1 rounded-xl bg-sky-400 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:opacity-50"
          >
            {is_pending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
