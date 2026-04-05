import Link from "next/link";

type ProductRow = {
  id: number;
  sku: string;
  nombre: string;
  imagenUrl: string | null;
  precio: number;
  estado: string;
  stock: number;
  stock_minimo: number;
};

type ProductTableProps = {
  productos: ProductRow[];
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export function ProductTable({ productos }: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="border-b border-white/10 bg-white/5">
            <tr className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <th className="px-6 py-4 font-semibold">SKU</th>
              <th className="px-6 py-4 font-semibold">Nombre</th>
              <th className="px-6 py-4 font-semibold">Foto</th>
              <th className="px-6 py-4 font-semibold">Estado</th>
              <th className="px-6 py-4 font-semibold">Precio</th>
              <th className="px-6 py-4 font-semibold">Stock</th>
              <th className="px-6 py-4 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                  No hay productos registrados todavia.
                </td>
              </tr>
            ) : (
              productos.map((producto) => {
                const is_out_of_stock = producto.stock <= 0;
                const is_low_stock =
                  producto.stock > 0 && producto.stock <= producto.stock_minimo;

                return (
                  <tr
                    key={producto.id}
                    className="border-b border-white/5 align-top text-sm text-slate-200 transition hover:bg-white/5"
                  >
                    <td className="px-6 py-4 font-medium text-sky-200">{producto.sku}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{producto.nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      {producto.imagenUrl ? (
                        <img
                          src={producto.imagenUrl}
                          alt={producto.nombre}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xs text-slate-500">
                          <div className="flex flex-col items-center">
                            <span className="text-lg">[]</span>
                            <span>Sin foto</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          producto.estado === "Activo"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {producto.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-300">
                      {currency_formatter.format(producto.precio)}
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 font-medium ${
                          is_out_of_stock
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                            : is_low_stock
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : "border-white/10 bg-white/5 text-white"
                        }`}
                      >
                        {is_out_of_stock || is_low_stock ? (
                          <span className="text-sm font-bold">!</span>
                        ) : null}
                        <span className="text-sm font-semibold">{producto.stock}</span>
                        <span className="text-xs opacity-80">min {producto.stock_minimo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex min-w-[220px] flex-col gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400">
                          Las operaciones de stock viven ahora en el detalle del producto.
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <Link
                            href={`/inventario/${producto.id}/editar`}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 hover:text-emerald-200"
                          >
                            Ver detalle
                          </Link>
                          <Link
                            href={`/inventario/${producto.id}/editar`}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300 hover:text-amber-200"
                          >
                            Editar ficha
                          </Link>
                          <Link
                            href={`/inventario?producto_id=${producto.id}`}
                            className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300 hover:text-sky-200"
                          >
                            Ver kardex
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
