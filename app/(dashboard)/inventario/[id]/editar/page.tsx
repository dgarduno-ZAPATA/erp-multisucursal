import { notFound } from "next/navigation";
import Link from "next/link";

import { getProductoById, updateProducto } from "@/actions/productos";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { get_inventory_movements } from "@/lib/inventory/movements";
import { MovementHistory } from "@/components/inventario/movement-history";
import { ProductOperationsPanel } from "@/components/inventario/product-operations-panel";

type EditarProductoPageProps = {
  params: { id: string };
  searchParams?: { ok?: string; error?: string };
};

export default async function EditarProductoPage({
  params,
  searchParams,
}: EditarProductoPageProps) {
  await require_roles(["admin", "gerente"]);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [{ sucursales }, producto, movimientos] = await Promise.all([
    get_accessible_sucursales(),
    getProductoById(id),
    get_inventory_movements({ producto_id: id, limit: 100 }),
  ]);
  if (!producto) notFound();

  const ok = searchParams?.ok === "1";
  const error_msg = searchParams?.error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
              Inventario
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Editar producto
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {producto.sku} · {producto.nombre}
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

      {/* Feedback */}
      {ok && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
          Producto actualizado correctamente.
        </div>
      )}
      {error_msg && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-300">
          {decodeURIComponent(error_msg)}
        </div>
      )}

      {/* Form */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="mx-auto max-w-3xl">
          <form action={updateProducto} className="grid gap-5">
            <input type="hidden" name="id" value={producto.id} />

            {/* SKU + Nombre */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="sku" className="text-sm font-medium text-slate-200">
                  SKU <span className="text-rose-400">*</span>
                </label>
                <input
                  id="sku"
                  name="sku"
                  type="text"
                  defaultValue={producto.sku}
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
                  defaultValue={producto.nombre}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                  required
                />
              </div>
            </div>

            {/* Categoría + Código de barras */}
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="categoria" className="text-sm font-medium text-slate-200">
                  Categoría
                </label>
                <input
                  id="categoria"
                  name="categoria"
                  type="text"
                  defaultValue={producto.categoria}
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
                  defaultValue={producto.codigo_barras ?? ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </div>

            {/* Precio + Costo */}
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
                  defaultValue={Number(producto.precio)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
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
                  defaultValue={producto.costo !== null ? Number(producto.costo) : ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
            </div>

            {/* Stock mínimo + Estado */}
            <div className="grid gap-5 md:grid-cols-2">
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
                  defaultValue={producto.stock_minimo}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>
              <div>
                <label htmlFor="activo" className="text-sm font-medium text-slate-200">
                  Estado
                </label>
                <select
                  id="activo"
                  name="activo"
                  defaultValue={producto.activo ? "true" : "false"}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="text-sm font-medium text-slate-200">
                Descripción
                <span className="ml-2 text-xs text-slate-500">(opcional)</span>
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={3}
                defaultValue={producto.descripcion ?? ""}
                placeholder="Descripción del producto para referencia interna..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/20"
              />
            </div>

            {/* Fotografía */}
            <div>
              <label htmlFor="imagen" className="text-sm font-medium text-slate-200">
                Fotografía
                <span className="ml-2 text-xs text-slate-500">
                  (opcional — solo si quieres reemplazar la actual)
                </span>
              </label>
              {producto.imagenUrl && (
                <img
                  src={producto.imagenUrl}
                  alt={producto.nombre}
                  className="mt-2 h-20 w-20 rounded-2xl object-cover"
                />
              )}
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
                className="inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Guardar cambios
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

      <ProductOperationsPanel
        producto_id={producto.id}
        stock_minimo_default={producto.stock_minimo}
        sucursales={sucursales}
        inventario={producto.inventario}
      />

      <MovementHistory
        movimientos={movimientos}
        producto_filtrado={{
          id: producto.id,
          nombre: producto.nombre,
          sku: producto.sku,
        }}
      />
    </div>
  );
}
