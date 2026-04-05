"use client";

import { useState, useTransition } from "react";

import { verifyPin } from "@/actions/usuarios";
import { use_pos_store } from "@/hooks/use-pos-store";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "✓"] as const;

export function PinLogin() {
  const [is_open, set_is_open] = useState(false);
  const [digits, set_digits] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  const active_operator = use_pos_store((s) => s.active_operator);
  const set_active_operator = use_pos_store((s) => s.set_active_operator);

  function handle_key(key: string) {
    if (key === "←") {
      set_digits((d) => d.slice(0, -1));
      set_error(null);
      return;
    }
    if (key === "✓") {
      handle_confirm();
      return;
    }
    if (digits.length >= 6) return;
    set_digits((d) => d + key);
    set_error(null);
  }

  function handle_confirm() {
    if (digits.length < 4) {
      set_error("El PIN debe tener entre 4 y 6 dígitos.");
      return;
    }
    start_transition(async () => {
      const usuario = await verifyPin(digits);
      if (!usuario) {
        set_error("PIN incorrecto.");
        set_digits("");
        return;
      }
      set_active_operator({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
      set_is_open(false);
      set_digits("");
      set_error(null);
    });
  }

  function handle_close() {
    set_is_open(false);
    set_digits("");
    set_error(null);
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => set_is_open(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-200">
          {active_operator ? active_operator.nombre.charAt(0).toUpperCase() : "?"}
        </span>
        <span className="hidden sm:inline">
          {active_operator ? active_operator.nombre : "Cambiar operador"}
        </span>
      </button>

      {/* Modal */}
      {is_open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-xs rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  POS
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-white">
                  Identificación
                </h2>
              </div>
              <button
                type="button"
                onClick={handle_close}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* PIN display */}
            <div className="mt-5 flex justify-center gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`h-3 w-3 rounded-full border transition ${
                    i < digits.length
                      ? "border-sky-400 bg-sky-400"
                      : "border-slate-600 bg-transparent"
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-center text-xs text-rose-300">
                {error}
              </p>
            )}

            {/* Keypad */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handle_key(k)}
                  disabled={is_pending || (k === "✓" && digits.length < 4)}
                  className={`rounded-2xl py-4 text-lg font-semibold transition ${
                    k === "✓"
                      ? "bg-sky-400 text-slate-950 hover:bg-sky-300 disabled:opacity-40"
                      : k === "←"
                        ? "border border-slate-700 bg-transparent text-slate-400 hover:text-white"
                        : "border border-slate-800 bg-slate-800 text-white hover:bg-slate-700"
                  } disabled:cursor-not-allowed`}
                >
                  {is_pending && k === "✓" ? "..." : k}
                </button>
              ))}
            </div>

            {/* Current operator */}
            {active_operator && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-800/60 px-4 py-3 text-sm">
                <span className="text-slate-400">Operador actual</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{active_operator.nombre}</span>
                  <button
                    type="button"
                    onClick={() => { set_active_operator(null); handle_close(); }}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Salir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
