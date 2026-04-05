import Link from "next/link";

import { createProducto } from "@/actions/productos";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";

type NuevoProductoPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function NuevoProductoPage({
  searchParams,
}: NuevoProductoPageProps) {
  await require_roles(["admin", "gerente"]);
  const { db_user, sucursales } = await get_accessible_sucursales();
  const error_message = searchParams?.error;
  const can_submit = Boolean(db_user) && sucursales.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
              Inventario
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Nuevo producto
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Registra un producto real en la base de datos y define su stock
              inicial para comenzar a operar.
            </p>
          </div>

          <Link
            href="/inventario"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver al inventario
          </Link>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="mx-auto max-w-3xl">
          {error_message ? (
            <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error_message}
            </div>
          ) : null}

          {!can_submit ? (
            <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Necesitas al menos una sucursal accesible para registrar productos con stock.
            </div>
          ) : null}

          <form action={createProducto} className="grid gap-5">
            {/* Fila 1: SKU + Nombre */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="sku" className="text-sm font-medium text-slate-200">
                  SKU <span className="text-rose-400">*</span>
                </label>
                <input
                  id="sku"
                  name="sku"
                  type="text"
                  placeholder="PROD-001"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="nombre" className="text-sm font-medium text-slate-200">
                  Nombre <span className="text-rose-400">*</span>
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Proteína Whey 1kg"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                />
              </div>
            </div>

            {/* Fila 2: Categoría + Código de barras */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="categoria" className="text-sm font-medium text-slate-200">
                  Categoría
                </label>
                <input
                  id="categoria"
                  name="categoria"
                  type="text"
                  placeholder="Proteínas"
                  defaultValue="General"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div>
                <label htmlFor="codigo_barras" className="text-sm font-medium text-slate-200">
                  Código de barras
                  <span className="ml-2 text-xs text-slate-500">(EAN-13 / UPC)</span>
                </label>
                <input
                  id="codigo_barras"
                  name="codigo_barras"
                  type="text"
                  placeholder="7501234567890"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </div>

            {/* Fila 3: Precio venta + Costo */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="precio" className="text-sm font-medium text-slate-200">
                  Precio de venta <span className="text-rose-400">*</span>
                </label>
                <input
                  id="precio"
                  name="precio"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="costo" className="text-sm font-medium text-slate-200">
                  Costo de compra
                  <span className="ml-2 text-xs text-slate-500">(opcional)</span>
                </label>
                <input
                  id="costo"
                  name="costo"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </div>

            {/* Fila 4: Stock inicial + Stock mínimo */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="sucursal_id" className="text-sm font-medium text-slate-200">
                  Sucursal destino <span className="text-rose-400">*</span>
                </label>
                <select
                  id="sucursal_id"
                  name="sucursal_id"
                  defaultValue={sucursales[0]?.id ? String(sucursales[0].id) : ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                  disabled={!can_submit || sucursales.length === 0}
                >
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="stock_inicial" className="text-sm font-medium text-slate-200">
                  Stock inicial <span className="text-rose-400">*</span>
                </label>
                <input
                  id="stock_inicial"
                  name="stock_inicial"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="stock_minimo" className="text-sm font-medium text-slate-200">
                  Stock mínimo
                  <span className="ml-2 text-xs text-slate-500">(alerta de reposición)</span>
                </label>
                <input
                  id="stock_minimo"
                  name="stock_minimo"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="5"
                  defaultValue="5"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </div>

            {/* Fila 5: Fotografía */}
            <div>
              <label htmlFor="imagen" className="text-sm font-medium text-slate-200">
                Fotografía
                <span className="ml-2 text-xs text-slate-500">(opcional)</span>
              </label>
              <input
                id="imagen"
                name="imagen"
                type="file"
                accept="image/*"
                className="mt-2 block w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-400/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-sky-300 hover:file:bg-sky-400/20"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row">
              <button
                type="submit"
                disabled={!can_submit}
                className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Guardar producto
              </button>
              <Link
                href="/inventario"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
