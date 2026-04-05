"use client";

import { useState, useTransition } from "react";

import { setPin, clearPin } from "@/actions/usuarios";

type SetPinFormProps = {
  usuario_id: string;
  has_pin: boolean;
};

export function SetPinForm({ usuario_id, has_pin }: SetPinFormProps) {
  const [mode, set_mode] = useState<"idle" | "set">("idle");
  const [pin, set_pin] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [success, set_success] = useState(false);
  const [is_pending, start_transition] = useTransition();

  function handle_set() {
    if (!/^\d{4,6}$/.test(pin)) {
      set_error("Ingresa un PIN de 4 a 6 dígitos.");
      return;
    }
    set_error(null);
    start_transition(async () => {
      const result = await setPin(usuario_id, pin);
      if (!result.success) {
        set_error(result.error);
        return;
      }
      set_success(true);
      set_mode("idle");
      set_pin("");
      setTimeout(() => set_success(false), 2000);
    });
  }

  function handle_clear() {
    start_transition(async () => {
      await clearPin(usuario_id);
      set_success(true);
      setTimeout(() => set_success(false), 2000);
    });
  }

  if (success) {
    return (
      <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
        Guardado
      </span>
    );
  }

  if (mode === "set") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => { set_pin(e.target.value.replace(/\D/g, "")); set_error(null); }}
          placeholder="4–6 dígitos"
          className="w-28 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-400/40"
        />
        <button
          type="button"
          onClick={handle_set}
          disabled={is_pending}
          className="rounded-xl bg-sky-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-300 disabled:opacity-50"
        >
          {is_pending ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => { set_mode("idle"); set_pin(""); set_error(null); }}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          Cancelar
        </button>
        {error && <span className="text-xs text-rose-400">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {has_pin ? (
        <>
          <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
            PIN activo
          </span>
          <button
            type="button"
            onClick={() => set_mode("set")}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={handle_clear}
            disabled={is_pending}
            className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50"
          >
            Quitar
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => set_mode("set")}
          className="rounded-xl border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
        >
          Asignar PIN
        </button>
      )}
    </div>
  );
}
