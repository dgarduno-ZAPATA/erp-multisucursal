"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  ajustarStockProducto,
  restockProducto,
  transferirStockProducto,
} from "@/actions/productos";

type BranchOption = {
  id: number;
  nombre: string;
  codigo: string;
};

type InventoryRow = {
  id: number;
  sucursal_id: number;
  stock_actual: number;
  stock_minimo: number;
  sucursal: BranchOption;
};

type ProductOperationsPanelProps = {
  producto_id: number;
  stock_minimo_default: number;
  sucursales: BranchOption[];
  inventario: InventoryRow[];
};

export function ProductOperationsPanel({
  producto_id,
  stock_minimo_default,
  sucursales,
  inventario,
}: ProductOperationsPanelProps) {
  const router = useRouter();
  const [error, set_error] = useState<string | null>(null);
  const [success, set_success] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  const default_branch_id = sucursales[0]?.id ? String(sucursales[0].id) : "";
  const default_target_branch_id = sucursales[1]?.id
    ? String(sucursales[1].id)
    : sucursales[0]?.id
      ? String(sucursales[0].id)
      : "";

  const inventory_map = useMemo(
    () => new Map(inventario.map((item) => [item.sucursal_id, item])),
    [inventario],
  );

  function show_result(message: string) {
    set_success(message);
    setTimeout(() => set_success(null), 2200);
  }

  function run_action(
    action: (formData: FormData) => Promise<{ success: boolean; error?: string }>,
    formData: FormData,
    success_message: string,
  ) {
    set_error(null);
    set_success(null);

    start_transition(async () => {
      const result = await action(formData);
      if (!result.success) {
        set_error(result.error ?? "No se pudo completar la operacion.");
        return;
      }

      show_result(success_message);
      router.refresh();
    });
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Existencia por sucursal
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Stock actual
        </h2>

        <div className="mt-5 grid gap-4">
          {inventario.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
              Este producto aun no tiene registros de inventario por sucursal.
            </div>
          ) : (
            inventario.map((item) => {
              const in_risk = item.stock_actual <= item.stock_minimo;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${
                    in_risk
                      ? "border-amber-400/20 bg-amber-400/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{item.sucursal.nombre}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {item.sucursal.codigo}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        in_risk
                          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                          : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      {in_risk ? "En riesgo" : "Estable"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <div className="text-slate-500">Stock</div>
                      <div className="mt-1 text-lg font-semibold text-white">{item.stock_actual}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                      <div className="text-slate-500">Minimo</div>
                      <div className="mt-1 text-lg font-semibold text-white">{item.stock_minimo}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>

      <article className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Operaciones
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Movimientos del producto
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Entrada, ajuste y transferencia concentrados en el detalle para no saturar el listado principal.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("producto_id", String(producto_id));
              formData.set("stock_minimo", String(stock_minimo_default));
              run_action(restockProducto, formData, "Entrada registrada correctamente.");
            }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm font-semibold text-white">Entrada de stock</div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_120px]">
              <select
                name="sucursal_id"
                defaultValue={default_branch_id}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              >
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                placeholder="Cantidad"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              />
            </div>
            <input
              name="motivo"
              type="text"
              placeholder="Motivo de entrada"
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            />
            <button
              type="submit"
              disabled={is_pending}
              className="mt-3 rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_pending ? "Guardando..." : "Registrar entrada"}
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("producto_id", String(producto_id));
              run_action(ajustarStockProducto, formData, "Ajuste aplicado correctamente.");
            }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm font-semibold text-white">Ajuste manual</div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_140px]">
              <select
                name="sucursal_id"
                defaultValue={default_branch_id}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              >
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                    {inventory_map.has(sucursal.id)
                      ? ` · stock ${inventory_map.get(sucursal.id)?.stock_actual ?? 0}`
                      : " · sin registro"}
                  </option>
                ))}
              </select>
              <input
                name="ajuste"
                type="number"
                step="1"
                placeholder="+5 o -3"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              />
            </div>
            <input
              name="motivo"
              type="text"
              placeholder="Motivo del ajuste"
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            />
            <button
              type="submit"
              disabled={is_pending}
              className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_pending ? "Guardando..." : "Aplicar ajuste"}
            </button>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("producto_id", String(producto_id));
              run_action(transferirStockProducto, formData, "Transferencia registrada correctamente.");
            }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm font-semibold text-white">Transferencia entre sucursales</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <select
                name="sucursal_origen_id"
                defaultValue={default_branch_id}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              >
                {sucursales.map((sucursal) => (
                  <option key={`origen-${sucursal.id}`} value={sucursal.id}>
                    Origen: {sucursal.nombre}
                  </option>
                ))}
              </select>
              <select
                name="sucursal_destino_id"
                defaultValue={default_target_branch_id}
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              >
                {sucursales.map((sucursal) => (
                  <option key={`destino-${sucursal.id}`} value={sucursal.id}>
                    Destino: {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                placeholder="Cantidad"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                required
              />
              <input
                name="motivo"
                type="text"
                placeholder="Motivo de la transferencia"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
              />
            </div>
            <button
              type="submit"
              disabled={is_pending || sucursales.length < 2}
              className="mt-3 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_pending ? "Guardando..." : "Transferir stock"}
            </button>
          </form>
        </div>
      </article>
    </section>
  );
}
