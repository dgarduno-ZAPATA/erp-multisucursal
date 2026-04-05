"use client";

import { useState, useTransition } from "react";

import { createSucursal } from "@/actions/sucursales";

export function CreateSucursalForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createSucursal(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const form = document.getElementById("create-sucursal-form") as HTMLFormElement | null;
      form?.reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <form
      id="create-sucursal-form"
      action={handleSubmit}
      className="grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Sucursales
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Nueva sucursal
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Crea una sucursal operativa para asignar usuarios, inventario y ventas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="nombre"
          placeholder="Nombre de sucursal"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
          required
        />
        <input
          name="codigo"
          placeholder="Codigo corto"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm uppercase text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="direccion"
          placeholder="Direccion"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        />
        <input
          name="telefono"
          placeholder="Telefono"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Sucursal creada correctamente.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Crear sucursal"}
      </button>
    </form>
  );
}
