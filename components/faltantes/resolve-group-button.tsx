"use client";

import { useTransition } from "react";

import { atenderGrupoFaltantes } from "@/actions/faltantes";

type ResolveGroupButtonProps = {
  producto_id: number;
  sucursal_id: number;
};

export function ResolveGroupButton({
  producto_id,
  sucursal_id,
}: ResolveGroupButtonProps) {
  const [is_pending, start_transition] = useTransition();

  function handle_click() {
    start_transition(async () => {
      await atenderGrupoFaltantes(producto_id, sucursal_id);
    });
  }

  return (
    <button
      type="button"
      onClick={handle_click}
      disabled={is_pending}
      className="inline-flex items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {is_pending ? "Resolviendo..." : "Resolver grupo"}
    </button>
  );
}
