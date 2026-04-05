"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { cancelarVenta } from "@/actions/ventas";

type CancelSaleButtonProps = {
  venta_id: number;
  folio: string;
  disabled?: boolean;
  can_cancel?: boolean;
};

export function CancelSaleButton({
  venta_id,
  folio,
  disabled = false,
  can_cancel = false,
}: CancelSaleButtonProps) {
  const router = useRouter();
  const [is_pending, start_transition] = useTransition();

  if (!can_cancel) {
    return (
      <span className="inline-flex items-center rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-600">
        Sin permiso
      </span>
    );
  }

  function handle_click() {
    const should_cancel = window.confirm(`Se cancelara la venta ${folio} y se devolvera el stock. Continuar?`);
    if (!should_cancel) return;

    const motivo = window.prompt(
      "Motivo de cancelacion (opcional):",
      "Cancelacion solicitada desde panel de ventas",
    );

    start_transition(async () => {
      const result = await cancelarVenta(venta_id, motivo ?? undefined);
      if (!result.success) {
        window.alert(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handle_click}
      disabled={disabled || is_pending}
      className="inline-flex items-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {is_pending ? "Cancelando..." : "Cancelar"}
    </button>
  );
}
