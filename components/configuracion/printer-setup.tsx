"use client";

import { useState, useEffect } from "react";

import { use_thermal_printer } from "@/hooks/use-thermal-printer";
import type { PrinterWidthOption } from "@/lib/printing/bluetooth";
import { PRINTER_WIDTH_KEY } from "@/lib/printing/bluetooth";

const WIDTH_OPTIONS: { value: PrinterWidthOption; label: string; chars: string }[] = [
  { value: "58mm", label: "58 mm", chars: "32 caracteres" },
  { value: "80mm", label: "80 mm", chars: "48 caracteres" },
];

const STATUS_LABELS: Record<string, string> = {
  idle: "Sin conectar",
  connecting: "Conectando...",
  connected: "Conectada",
  printing: "Imprimiendo...",
  error: "Error de conexion",
};

const STATUS_COLORS: Record<string, string> = {
  idle: "border-slate-700 bg-slate-800/40 text-slate-400",
  connecting: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  connected: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  printing: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300",
};

export function PrinterSetup() {
  const { status, error, is_connected, connect, disconnect, print } = use_thermal_printer();
  const [device_name, set_device_name] = useState<string | null>(null);
  const [width, set_width] = useState<PrinterWidthOption>("58mm");
  const [bt_supported, set_bt_supported] = useState(true);

  useEffect(() => {
    set_bt_supported("bluetooth" in navigator);
    const saved = localStorage.getItem(PRINTER_WIDTH_KEY) as PrinterWidthOption | null;
    if (saved && (saved === "58mm" || saved === "80mm")) set_width(saved);
  }, []);

  function handle_width_change(w: PrinterWidthOption) {
    set_width(w);
    localStorage.setItem(PRINTER_WIDTH_KEY, w);
  }

  async function handle_connect() {
    const conn = await connect();
    if (conn) set_device_name(conn.device.name ?? "Impresora BT");
  }

  function handle_disconnect() {
    disconnect();
    set_device_name(null);
  }

  async function handle_test_print() {
    const { build_ticket } = await import("@/lib/printing/ticket");
    const { PRINTER_WIDTHS } = await import("@/lib/printing/escpos");
    const test_ticket = {
      branch_name: "Ticket de prueba",
      folio: "TEST-001",
      items: [
        {
          producto_id: 0,
          nombre: "Producto ejemplo",
          precio_unitario: 99.0,
          cantidad: 2,
          stock_disponible: 99,
        },
      ],
      total: 198.0,
      metodo_pago: "efectivo" as const,
      monto_recibido: 200,
      cambio: 2,
      timestamp: new Date().toISOString(),
      width: PRINTER_WIDTHS[width],
    };
    await print(build_ticket(test_ticket));
  }

  if (!bt_supported) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5 text-sm text-amber-300">
        <p className="font-semibold">Web Bluetooth no disponible</p>
        <p className="mt-1 text-amber-400/80">
          Usa Chrome o Edge en Android o escritorio. Safari y Firefox no soportan Web Bluetooth.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado actual */}
      <div
        className={`flex items-center gap-4 rounded-2xl border p-5 ${STATUS_COLORS[status]}`}
      >
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${
            is_connected
              ? "bg-emerald-400"
              : status === "connecting" || status === "printing"
                ? "animate-pulse bg-sky-400"
                : status === "error"
                  ? "bg-rose-400"
                  : "bg-slate-600"
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{STATUS_LABELS[status]}</p>
          {device_name && is_connected && (
            <p className="mt-0.5 truncate text-xs opacity-70">{device_name}</p>
          )}
        </div>
        {is_connected && (
          <button
            type="button"
            onClick={handle_disconnect}
            className="shrink-0 rounded-xl border border-current/30 px-3 py-1.5 text-xs font-semibold opacity-80 transition hover:opacity-100"
          >
            Desconectar
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {/* Ancho de papel */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Ancho de papel
        </p>
        <div className="grid grid-cols-2 gap-3">
          {WIDTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handle_width_change(opt.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                width === opt.value
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                  : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              <p className="text-lg font-semibold">{opt.label}</p>
              <p className="mt-1 text-xs opacity-70">{opt.chars}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Se guarda por dispositivo. Cambia segun el rollo instalado en tu impresora.
        </p>
      </div>

      {/* Acciones */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!is_connected ? (
          <button
            type="button"
            onClick={handle_connect}
            disabled={status === "connecting"}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-5 py-4 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "connecting" ? (
              "Buscando impresora..."
            ) : (
              <>
                <span className="text-base">🖨</span>
                Conectar impresora
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handle_test_print}
            disabled={status === "printing"}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "printing" ? (
              "Imprimiendo..."
            ) : (
              <>
                <span className="text-base">🖨</span>
                Imprimir ticket de prueba
              </>
            )}
          </button>
        )}
      </div>

      {/* Instrucciones */}
      {!is_connected && (
        <ol className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Como parear (una sola vez)
          </p>
          {[
            "Enciende la impresora y activa su Bluetooth.",
            'Toca "Conectar impresora" — el navegador mostrara un selector.',
            "Selecciona tu impresora de la lista.",
            "Imprime el ticket de prueba para confirmar.",
            "Listo. El navegador recuerda la impresora para proximas ventas.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 text-[11px] font-semibold text-slate-500">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
