"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { abrirCaja, cerrarCaja } from "@/actions/caja";

type CashboxCardProps = {
  caja:
    | {
        estado: "abierta" | "cerrada";
        monto_inicial: number;
        ventas_efectivo: number;
        ventas_tarjeta: number;
        ventas_transferencia: number;
        monto_esperado: number | null;
        monto_final_declarado: number | null;
        diferencia: number | null;
        observaciones_apertura: string | null;
        observaciones_cierre: string | null;
        hora_apertura: string;
        hora_cierre: string | null;
        total_vendido: number;
        tickets_vendidos: number;
        arqueo_estatus: "cuadrada" | "sobrante" | "faltante";
      }
    | null;
  asistencia_activa: boolean;
  historial_cierres: {
    id: number;
    fecha_operativa: string;
    estado: "abierta" | "cerrada";
    sucursal_nombre: string;
    monto_inicial: number;
    monto_esperado: number | null;
    monto_final_declarado: number | null;
    diferencia: number | null;
    hora_apertura: string;
    hora_cierre: string | null;
  }[];
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const time_formatter = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
});

export function CashboxCard({ caja, asistencia_activa, historial_cierres }: CashboxCardProps) {
  const router = useRouter();
  const [opening_amount, set_opening_amount] = useState("");
  const [opening_notes, set_opening_notes] = useState("");
  const [closing_amount, set_closing_amount] = useState(
    caja?.monto_esperado ? String(caja.monto_esperado) : "",
  );
  const [closing_notes, set_closing_notes] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  function handle_open() {
    const amount = Number(opening_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      set_error("Captura un fondo inicial valido.");
      return;
    }

    set_error(null);
    start_transition(async () => {
      const result = await abrirCaja(amount, opening_notes);
      if (!result.success) {
        set_error(result.error);
        return;
      }
      set_opening_amount("");
      set_opening_notes("");
      router.refresh();
    });
  }

  function handle_close() {
    const amount = Number(closing_amount);
    if (!Number.isFinite(amount) || amount < 0) {
      set_error("Captura el monto final declarado.");
      return;
    }

    set_error(null);
    start_transition(async () => {
      const result = await cerrarCaja(amount, closing_notes);
      if (!result.success) {
        set_error(result.error);
        return;
      }
      set_closing_notes("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 text-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
            Caja por turno
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Apertura y cierre diario
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Registra el fondo inicial, monitorea lo esperado en efectivo y cierra tu caja al final del turno.
          </p>
        </div>

        {caja ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Apertura {time_formatter.format(new Date(caja.hora_apertura))}
            {caja.hora_cierre ? ` | Cierre ${time_formatter.format(new Date(caja.hora_cierre))}` : ""}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!asistencia_activa ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          Primero registra tu llegada para operar la caja del dia.
        </div>
      ) : !caja ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={opening_amount}
              onChange={(event) => set_opening_amount(event.target.value)}
              placeholder="Fondo inicial"
              className="w-full min-w-[220px] rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            />
            <textarea
              value={opening_notes}
              onChange={(event) => set_opening_notes(event.target.value)}
              placeholder="Observaciones de apertura (opcional)"
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            />
          </div>
          <button
            type="button"
            onClick={handle_open}
            disabled={is_pending || !opening_amount}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_pending ? "Abriendo..." : "Abrir caja"}
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Fondo inicial</p>
              <p className="mt-2 text-2xl font-semibold text-sky-300">
                {currency_formatter.format(caja.monto_inicial)}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ventas efectivo</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {currency_formatter.format(caja.ventas_efectivo)}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ventas tarjeta</p>
              <p className="mt-2 text-2xl font-semibold text-violet-300">
                {currency_formatter.format(caja.ventas_tarjeta)}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transferencias</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">
                {currency_formatter.format(caja.ventas_transferencia)}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Venta total</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {currency_formatter.format(caja.total_vendido)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {caja.tickets_vendidos} ticket{caja.tickets_vendidos === 1 ? "" : "s"}
              </p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Arqueo</p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  caja.arqueo_estatus === "cuadrada"
                    ? "text-emerald-300"
                    : caja.arqueo_estatus === "sobrante"
                      ? "text-sky-300"
                      : "text-rose-300"
                }`}
              >
                {caja.arqueo_estatus}
              </p>
            </article>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Cierre esperado</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {currency_formatter.format(caja.monto_esperado ?? caja.monto_inicial)}
            </p>

            {caja.estado === "abierta" ? (
              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={closing_amount}
                  onChange={(event) => set_closing_amount(event.target.value)}
                  placeholder="Monto final declarado"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                />
                <textarea
                  value={closing_notes}
                  onChange={(event) => set_closing_notes(event.target.value)}
                  placeholder="Observaciones de cierre (opcional)"
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                />
                <button
                  type="button"
                  onClick={handle_close}
                  disabled={is_pending || !closing_amount}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {is_pending ? "Cerrando..." : "Cerrar caja"}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Monto declarado</span>
                  <span className="font-semibold text-white">
                    {currency_formatter.format(caja.monto_final_declarado ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Diferencia</span>
                  <span
                    className={`font-semibold ${
                      (caja.diferencia ?? 0) === 0
                        ? "text-emerald-300"
                        : (caja.diferencia ?? 0) > 0
                          ? "text-sky-300"
                          : "text-rose-300"
                    }`}
                  >
                    {currency_formatter.format(caja.diferencia ?? 0)}
                  </span>
                </div>
                {caja.observaciones_cierre ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-300">
                    {caja.observaciones_cierre}
                  </div>
                ) : null}
              </div>
            )}

            {caja.observaciones_apertura ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                Apertura: {caja.observaciones_apertura}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Historial reciente
        </p>
        <div className="mt-4 space-y-3">
          {historial_cierres.length === 0 ? (
            <div className="text-sm text-slate-400">Todavia no hay cierres registrados.</div>
          ) : (
            historial_cierres.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="font-semibold text-white">{row.sucursal_nombre}</div>
                  <div className="text-xs text-slate-400">
                    {row.fecha_operativa} | {time_formatter.format(new Date(row.hora_apertura))}
                    {row.hora_cierre ? ` - ${time_formatter.format(new Date(row.hora_cierre))}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-slate-300">
                    inicial {currency_formatter.format(row.monto_inicial)}
                  </span>
                  <span className="text-slate-300">
                    esperado {currency_formatter.format(row.monto_esperado ?? row.monto_inicial)}
                  </span>
                  <span
                    className={
                      (row.diferencia ?? 0) === 0
                        ? "text-emerald-300"
                        : (row.diferencia ?? 0) > 0
                          ? "text-sky-300"
                          : "text-rose-300"
                    }
                  >
                    dif {currency_formatter.format(row.diferencia ?? 0)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
