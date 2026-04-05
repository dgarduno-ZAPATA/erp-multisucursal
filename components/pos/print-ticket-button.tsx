"use client";

import { use_thermal_printer } from "@/hooks/use-thermal-printer";
import type { TicketData } from "@/lib/printing/ticket";

type PrintTicketButtonProps = {
  ticket: TicketData;
};

export function PrintTicketButton({ ticket }: PrintTicketButtonProps) {
  const { status, error, is_connected, disconnect, print } = use_thermal_printer();

  async function handle_print() {
    const { build_ticket } = await import("@/lib/printing/ticket");
    const { PRINTER_WIDTHS } = await import("@/lib/printing/escpos");
    const width_key = localStorage.getItem("erp_printer_width") ?? "58mm";
    await print(build_ticket({ ...ticket, width: PRINTER_WIDTHS[width_key] }));
  }

  const is_busy = status === "connecting" || status === "printing";

  const label =
    status === "connecting"
      ? "Conectando..."
      : status === "printing"
        ? "Imprimiendo..."
        : "Imprimir ticket";

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handle_print}
          disabled={is_busy}
          className="flex-1 rounded-2xl border border-slate-700 bg-slate-800 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>

        {is_connected && (
          <button
            type="button"
            onClick={disconnect}
            title="Desconectar impresora"
            className="rounded-2xl border border-slate-700 bg-transparent px-3 py-3 text-xs text-slate-500 transition hover:border-slate-600 hover:text-slate-300"
          >
            ✕
          </button>
        )}
      </div>

      {is_connected && (
        <p className="text-center text-xs text-emerald-400/70">
          Impresora conectada via Bluetooth
        </p>
      )}
    </div>
  );
}
