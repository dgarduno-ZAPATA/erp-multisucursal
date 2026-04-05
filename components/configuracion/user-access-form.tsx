"use client";

import { useState, useTransition } from "react";

import { updateUsuarioAcceso } from "@/actions/usuarios";
import type { UsuarioRow } from "@/actions/usuarios";
import type { RolUsuario } from "@prisma/client";

type UserAccessFormProps = {
  usuario: UsuarioRow;
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

export function UserAccessForm({ usuario, sucursales }: UserAccessFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateUsuarioAcceso(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="usuario_id" value={usuario.id} />

      <select
        name="rol"
        defaultValue={usuario.rol}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>

      <select
        name="sucursal_id"
        defaultValue={usuario.sucursal_id ? String(usuario.sucursal_id) : ""}
        className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
      >
        <option value="">Sin sucursal</option>
        {sucursales.map((sucursal) => (
          <option key={sucursal.id} value={sucursal.id}>
            {sucursal.nombre}
          </option>
        ))}
      </select>

      <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="activo"
          value="true"
          defaultChecked={usuario.activo}
          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400"
        />
        Activo
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Guardar acceso"}
      </button>

      {success ? (
        <span className="text-xs font-semibold text-emerald-300">Actualizado</span>
      ) : null}
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </form>
  );
}
