"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cerrarTurnoOperativo, registrarEntradaSucursal } from "@/actions/asistencias";

type ShiftCheckinCardProps = {
  attendance:
    | {
        sucursal_nombre: string;
        hora_entrada: string;
        hora_salida: string | null;
        estado: "activa" | "cerrada";
      }
    | null;
  sucursales: {
    id: number;
    nombre: string;
    codigo: string;
  }[];
};

const time_formatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});

export function ShiftCheckinCard({ attendance, sucursales }: ShiftCheckinCardProps) {
  const router = useRouter();
  const [selected_branch, set_selected_branch] = useState(
    attendance ? "" : String(sucursales[0]?.id ?? ""),
  );
  const [error, set_error] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  function handle_checkin() {
    const sucursal_id = Number(selected_branch);
    if (!Number.isInteger(sucursal_id) || sucursal_id <= 0) {
      set_error("Selecciona una sucursal valida.");
      return;
    }

    set_error(null);
    start_transition(async () => {
      const result = await registrarEntradaSucursal(sucursal_id);
      if (!result.success) {
        set_error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handle_checkout() {
    set_error(null);
    start_transition(async () => {
      const result = await cerrarTurnoOperativo();
      if (!result.success) {
        set_error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
            Operacion diaria
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Sucursal operativa del dia
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            El operador registra la sucursal donde inicia turno. Esa sucursal se usa para ventas y faltantes del dia.
          </p>
        </div>

        {attendance ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
            <div className="font-semibold text-emerald-300">{attendance.sucursal_nombre}</div>
            <div className="mt-1 text-emerald-200/80">
              Entrada: {time_formatter.format(new Date(attendance.hora_entrada))}
              {attendance.hora_salida
                ? ` · Salida: ${time_formatter.format(new Date(attendance.hora_salida))}`
                : ""}
            </div>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {attendance ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Estado: {attendance.estado}
          </span>
          {!attendance.hora_salida && (
            <button
              type="button"
              onClick={handle_checkout}
              disabled={is_pending}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_pending ? "Cerrando..." : "Cerrar turno"}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <select
            value={selected_branch}
            onChange={(event) => set_selected_branch(event.target.value)}
            className="min-w-[240px] rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
          >
            <option value="">Selecciona sucursal</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre} · {sucursal.codigo}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handle_checkin}
            disabled={is_pending || !selected_branch}
            className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_pending ? "Registrando..." : "Registrar llegada"}
          </button>
        </div>
      )}
    </section>
  );
}
