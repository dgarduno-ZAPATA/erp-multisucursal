"use client";

import { useState, useTransition } from "react";

import { createUsuario } from "@/actions/usuarios";
import type { RolUsuario } from "@prisma/client";

type CreateUserFormProps = {
  sucursales: {
    id: number;
    nombre: string;
    codigo: string;
  }[];
};

const ROLE_OPTIONS: { value: RolUsuario; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "gerente", label: "Gerente" },
  { value: "cajero", label: "Cajero" },
  { value: "vendedor", label: "Vendedor" },
];

export function CreateUserForm({ sucursales }: CreateUserFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createUsuario(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      const form = document.getElementById("create-user-form") as HTMLFormElement | null;
      form?.reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <form
      id="create-user-form"
      action={handleSubmit}
      className="grid gap-4 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Usuarios
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Nuevo usuario
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Crea accesos completos para el sistema con rol, sucursal y contrasena inicial.
        </p>
      </div>

      <input
        name="nombre"
        placeholder="Nombre completo"
        className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        required
      />

      <input
        name="email"
        type="email"
        placeholder="correo@empresa.com"
        className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        required
      />

      <input
        name="password"
        type="password"
        placeholder="Contrasena inicial"
        className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        required
      />

      <div className="grid gap-4 md:grid-cols-2">
        <select
          name="rol"
          defaultValue="vendedor"
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <select
          name="sucursal_id"
          defaultValue={sucursales[0]?.id ? String(sucursales[0].id) : ""}
          className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
        >
          <option value="">Sin sucursal</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Usuario creado correctamente.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creando..." : "Crear usuario"}
      </button>
    </form>
  );
}
