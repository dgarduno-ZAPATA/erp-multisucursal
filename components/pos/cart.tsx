"use client";

import { useState, useTransition } from "react";

import { procesarVenta } from "@/actions/ventas";
import { use_pos_store, type MetodoPago } from "@/hooks/use-pos-store";
import { enqueue_venta } from "@/lib/offline/queue";
import { PrintTicketButton } from "@/components/pos/print-ticket-button";
import type { TicketData } from "@/lib/printing/ticket";

type CartProps = {
  branch_name?: string;
  default_operator?: {
    nombre: string;
    rol: string;
  } | null;
};

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function Cart({ branch_name = "Sucursal Principal", default_operator = null }: CartProps) {
  const [error_message, set_error_message] = useState<string | null>(null);
  const [completed_sale, set_completed_sale] = useState<TicketData | null>(null);
  const [is_checkout_mode, set_is_checkout_mode] = useState(false);
  const [monto_recibido, set_monto_recibido] = useState("");
  const [is_pending, start_transition] = useTransition();

  const items = use_pos_store((state) => state.items);
  const total = use_pos_store((state) => state.total);
  const metodo_pago = use_pos_store((state) => state.metodo_pago);
  const active_operator = use_pos_store((state) => state.active_operator);
  const set_metodo_pago = use_pos_store((state) => state.set_metodo_pago);
  const decrease_item = use_pos_store((state) => state.decrease_item);
  const increase_item = use_pos_store((state) => state.increase_item);
  const remove_item = use_pos_store((state) => state.remove_item);
  const clear_cart = use_pos_store((state) => state.clear_cart);

  const is_efectivo = metodo_pago === "efectivo";
  const monto_recibido_numero = Number.parseFloat(monto_recibido);
  const cambio =
    is_efectivo && Number.isFinite(monto_recibido_numero) && monto_recibido !== ""
      ? monto_recibido_numero - total
      : null;
  const can_confirm_sale =
    items.length > 0 &&
    (!is_efectivo || (monto_recibido !== "" && cambio !== null && cambio >= 0)) &&
    !is_pending;

  function reset_checkout_state() {
    set_is_checkout_mode(false);
    set_monto_recibido("");
  }

  function handle_enter_checkout() {
    if (items.length === 0) return;
    set_error_message(null);
    set_completed_sale(null);
    set_is_checkout_mode(true);
  }

  function handle_exit_checkout() {
    set_error_message(null);
    reset_checkout_state();
  }

  function handle_confirm_sale() {
    set_error_message(null);

    // Snapshot sale data before clearing the cart
    const snapshot: TicketData = {
      branch_name,
      operator_name: active_operator?.nombre ?? default_operator?.nombre,
      operator_role: active_operator?.rol ?? default_operator?.rol,
      items: [...items],
      total,
      metodo_pago,
      monto_recibido: is_efectivo ? monto_recibido_numero : undefined,
      cambio: is_efectivo && cambio !== null ? cambio : undefined,
      timestamp: new Date().toISOString(),
    };

    // Offline: queue the venta in IndexedDB
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      start_transition(async () => {
        await enqueue_venta(items, total, metodo_pago);
        window.dispatchEvent(new Event("venta-enqueued"));
        set_completed_sale(snapshot); // no folio — will be set on sync
        clear_cart();
        reset_checkout_state();
      });
      return;
    }

    start_transition(async () => {
      const result = await procesarVenta(
        items,
        total,
        metodo_pago,
        active_operator?.id,
      );
      if (!result.success) {
        set_error_message(result.error);
        return;
      }
      set_completed_sale({
        ...snapshot,
        folio: `VTA-${result.venta_id}`,
      });
      clear_cart();
      reset_checkout_state();
    });
  }

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <aside className="rounded-[28px] border border-slate-800 bg-slate-950 p-6 text-slate-50 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.8)]">
      <div className="border-b border-slate-800 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Ticket actual
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          Carrito de compra
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Estado local con Zustand para una experiencia fluida sin recargar.
        </p>
      </div>

      {error_message && (
        <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error_message}
        </div>
      )}

      {/* ── Venta completada ───────────────────────────────────────────── */}
      {completed_sale && (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-300">
              {completed_sale.folio ? "Venta registrada" : "Venta guardada offline"}
            </p>
            {completed_sale.folio && (
              <p className="mt-0.5 text-xs text-emerald-400/80">{completed_sale.folio}</p>
            )}
            {!completed_sale.folio && (
              <p className="mt-0.5 text-xs text-emerald-400/80">
                Se sincronizará al recuperar la conexión.
              </p>
            )}
          </div>

          <PrintTicketButton ticket={completed_sale} />

          <button
            type="button"
            onClick={() => set_completed_sale(null)}
            className="w-full rounded-2xl bg-sky-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
          >
            Nueva venta
          </button>
        </div>
      )}

      {/* ── Cart items ─────────────────────────────────────────────────── */}
      {!completed_sale && (
        <>
          <div className="mt-6 space-y-4">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-8 text-center text-sm text-slate-400">
                El carrito esta vacio. Agrega productos desde el panel izquierdo.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.producto_id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {item.nombre}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {currency_formatter.format(item.precio_unitario)} c/u
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove_item(item.producto_id)}
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300 transition hover:text-rose-200"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="inline-flex items-center rounded-2xl border border-slate-700 bg-slate-950">
                      <button
                        type="button"
                        onClick={() => decrease_item(item.producto_id)}
                        className="px-4 py-2 text-lg font-semibold text-slate-200 transition hover:text-white"
                      >
                        -
                      </button>
                      <span className="min-w-12 px-3 text-center text-sm font-semibold text-white">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => increase_item(item.producto_id)}
                        disabled={item.cantidad >= item.stock_disponible}
                        className={`px-4 py-2 text-lg font-semibold transition ${
                          item.cantidad >= item.stock_disponible
                            ? "cursor-not-allowed text-slate-500 opacity-50"
                            : "text-slate-200 hover:text-white"
                        }`}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Subtotal
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Stock maximo: {item.stock_disponible}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-300">
                        {currency_formatter.format(item.precio_unitario * item.cantidad)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                  Total a pagar
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {currency_formatter.format(total)}
                </p>
              </div>
              <div className="text-right text-sm text-emerald-100">
                {items.length} item{items.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {is_checkout_mode ? (
            <div className="mt-6 space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Método de pago
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {METODOS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        set_metodo_pago(m.value);
                        set_monto_recibido("");
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                        metodo_pago === m.value
                          ? "border-sky-400/60 bg-sky-400/20 text-sky-200"
                          : "border-slate-700 bg-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {is_efectivo && (
                <>
                  <div>
                    <label
                      htmlFor="monto_recibido"
                      className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
                    >
                      Efectivo recibido
                    </label>
                    <input
                      id="monto_recibido"
                      name="monto_recibido"
                      type="number"
                      min="0"
                      step="0.01"
                      value={monto_recibido}
                      onChange={(e) => set_monto_recibido(e.target.value)}
                      placeholder="0.00"
                      className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-lg font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Cambio
                    </p>
                    <p
                      className={`mt-2 text-2xl font-semibold tracking-tight ${
                        cambio !== null && cambio >= 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {cambio === null
                        ? currency_formatter.format(0)
                        : currency_formatter.format(cambio)}
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {cambio === null
                        ? "Captura el efectivo para calcular el cambio."
                        : cambio >= 0
                          ? "Monto suficiente para completar la venta."
                          : "El efectivo recibido no cubre el total."}
                    </p>
                  </div>
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handle_exit_checkout}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
                >
                  Atras
                </button>
                <button
                  type="button"
                  onClick={handle_confirm_sale}
                  disabled={!can_confirm_sale}
                  className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    can_confirm_sale
                      ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                      : "cursor-not-allowed bg-slate-700 text-slate-400 opacity-50"
                  }`}
                >
                  {is_pending ? "Procesando..." : "Confirmar venta"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  clear_cart();
                  reset_checkout_state();
                  set_error_message(null);
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-transparent px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handle_enter_checkout}
                disabled={items.length === 0 || is_pending}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cobrar
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
