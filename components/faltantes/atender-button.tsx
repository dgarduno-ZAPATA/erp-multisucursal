"use client";

import { useTransition } from "react";

import { atenderFaltante } from "@/actions/faltantes";

export function AtenderButton({ id }: { id: number }) {
  const [is_pending, start_transition] = useTransition();

  function handle_click() {
    start_transition(async () => {
      await atenderFaltante(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handle_click}
      disabled={is_pending}
      className="inline-flex items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {is_pending ? "..." : "Atender"}
    </button>
  );
}
