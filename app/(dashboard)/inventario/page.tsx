import Link from "next/link";

import { getProductos } from "@/actions/productos";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { get_inventory_movements_safe } from "@/lib/inventory/movements";
import { MovementHistory } from "@/components/inventario/movement-history";
import { ProductFilters } from "@/components/inventario/product-filters";
import { ProductPagination } from "@/components/inventario/product-pagination";
import { ProductTable } from "@/components/inventario/product-table";

const PAGE_SIZE = 20;

type InventarioPageProps = {
  searchParams?: {
    error?: string;
    producto_id?: string;
    q?: string;
    categoria?: string;
    estado?: string;
    stock?: string;
    page?: string;
  };
};

const S = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };

function InventoryShortcut({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl p-4 transition hover:-translate-y-0.5"
      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" }}
    >
      <p className="text-sm font-semibold" style={{ color: "#fafaf9" }}>
        {label}
      </p>
      <p className="mt-1 text-xs leading-5" style={{ color: "#52525b" }}>
        {description}
      </p>
    </Link>
  );
}

export default async function InventarioPage({ searchParams }: InventarioPageProps) {
  await require_roles(["admin", "gerente"]);

  const access = await get_accessible_sucursales();
  const { sucursales } = access;
  const producto_id = searchParams?.producto_id ? Number(searchParams.producto_id) : null;

  const q = searchParams?.q?.trim().toLowerCase() ?? "";
  const categoria_filter = searchParams?.categoria ?? "";
  const estado_filter = searchParams?.estado ?? "";
  const stock_filter = searchParams?.stock ?? "";
  const page = Math.max(1, Number(searchParams?.page ?? 1));

  const [{ movimientos, available: movements_available }, todos_los_productos] = await Promise.all([
    get_inventory_movements_safe({
      sucursal_ids: sucursales.map((sucursal) => sucursal.id),
      producto_id: producto_id && Number.isInteger(producto_id) ? producto_id : undefined,
      limit: producto_id ? 100 : 12,
    }),
    getProductos(),
  ]);

  const categorias = Array.from(
    new Set(todos_los_productos.map((producto) => producto.categoria).filter(Boolean)),
  ).sort() as string[];

  let productos_filtrados = todos_los_productos;
  if (q) {
    productos_filtrados = productos_filtrados.filter(
      (producto) => producto.nombre.toLowerCase().includes(q) || producto.sku.toLowerCase().includes(q),
    );
  }
  if (categoria_filter) {
    productos_filtrados = productos_filtrados.filter((producto) => producto.categoria === categoria_filter);
  }
  if (estado_filter === "activo") {
    productos_filtrados = productos_filtrados.filter((producto) => producto.estado === "Activo");
  } else if (estado_filter === "inactivo") {
    productos_filtrados = productos_filtrados.filter((producto) => producto.estado === "Inactivo");
  }
  if (stock_filter === "agotado") {
    productos_filtrados = productos_filtrados.filter((producto) => producto.stock <= 0);
  } else if (stock_filter === "en_riesgo") {
    productos_filtrados = productos_filtrados.filter(
      (producto) => producto.stock > 0 && producto.stock <= producto.stock_minimo,
    );
  } else if (stock_filter === "normal") {
    productos_filtrados = productos_filtrados.filter((producto) => producto.stock > producto.stock_minimo);
  }

  const total_filtrados = productos_filtrados.length;
  const productos_pagina = productos_filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const productos_agotados = todos_los_productos.filter((producto) => producto.stock <= 0).length;
  const productos_en_riesgo = todos_los_productos.filter(
    (producto) => producto.stock > 0 && producto.stock <= producto.stock_minimo,
  ).length;
  const producto_filtrado =
    producto_id && Number.isInteger(producto_id)
      ? todos_los_productos.find((producto) => producto.id === producto_id) ?? null
      : null;
  const error_message = searchParams?.error;
  const total_activos = todos_los_productos.filter((producto) => producto.estado === "Activo").length;
  const sucursales_con_stock = new Set(
    todos_los_productos.flatMap((producto) => (producto.sucursal_id ? [producto.sucursal_id] : [])),
  ).size;

  const filter_params = new URLSearchParams();
  if (q) filter_params.set("q", q);
  if (categoria_filter) filter_params.set("categoria", categoria_filter);
  if (estado_filter) filter_params.set("estado", estado_filter);
  if (stock_filter) filter_params.set("stock", stock_filter);
  const pagination_base = filter_params.toString() ? `/inventario?${filter_params.toString()}` : "/inventario";

  return (
    <div className="space-y-5">
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>
              Inventario
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
              Centro de control de inventario
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6" style={{ color: "#52525b" }}>
              Empieza por un resumen corto y baja al detalle solo cuando haga falta.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/v1/inventario/export"
              download
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.14)", color: "#34d399" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              Exportar
            </a>
            <Link
              href="/inventario/entrada"
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}
            >
              Entrada con lector
            </Link>
            <Link
              href="/inventario/conteo"
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}
            >
              Conteo fisico
            </Link>
            <Link
              href="/inventario/nuevo"
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "#f59e0b", color: "#0c0c0e" }}
            >
              + Nuevo producto
            </Link>
          </div>
        </div>
      </section>

      {error_message ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#fca5a5" }}
        >
          {error_message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl p-5" style={C}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
            Catalogo
          </p>
          <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
            {todos_los_productos.length}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#71717a" }}>
            Productos registrados
          </p>
        </article>
        <article className="rounded-2xl p-5" style={C}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
            Activos
          </p>
          <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
            {total_activos}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#71717a" }}>
            Listos para vender
          </p>
        </article>
        <article className="rounded-2xl p-5" style={C}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
            Cobertura
          </p>
          <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
            {sucursales_con_stock || sucursales.length}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#71717a" }}>
            Sucursales con stock
          </p>
        </article>
        <article className="rounded-2xl p-5" style={C}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
            Filtro actual
          </p>
          <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
            {total_filtrados}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: "#71717a" }}>
            Resultados visibles
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl p-5" style={S}>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
            Flujo sugerido
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
            Usa esta vista como tablero, no como bodega de todo
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InventoryShortcut
              href="/inventario/nuevo"
              label="Alta de producto"
              description="Crea la ficha y el stock inicial desde una ruta dedicada."
            />
            <InventoryShortcut
              href="/inventario/entrada"
              label="Entrada con lector"
              description="Ideal para tu lector de codigo de barras tipo teclado."
            />
            <InventoryShortcut
              href="/inventario/conteo"
              label="Conteo fisico"
              description="Separa conteos operativos del catalogo principal."
            />
            <InventoryShortcut
              href={producto_filtrado ? `/inventario/${producto_filtrado.id}/editar` : "/inventario"}
              label="Detalle del producto"
              description="Transferencias, ajustes y kardex viven en el detalle."
            />
          </div>
        </div>

        <div className="grid gap-4">
          <article
            className="rounded-2xl p-5"
            style={{ border: "1px solid rgba(248,113,113,0.18)", background: "rgba(248,113,113,0.07)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#f87171" }}>
              Alerta critica
            </p>
            <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
              {productos_agotados}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "#f87171" }}>
              Productos agotados
            </p>
          </article>
          <article
            className="rounded-2xl p-5"
            style={{ border: "1px solid rgba(245,158,11,0.18)", background: "rgba(245,158,11,0.07)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#f59e0b" }}>
              Riesgo operativo
            </p>
            <p className="mt-3 text-3xl font-bold" style={{ color: "#fafaf9" }}>
              {productos_en_riesgo}
            </p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "#f59e0b" }}>
              Productos en riesgo
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl p-5" style={S}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
              Catalogo
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
              Busqueda rapida y salto al detalle
            </h2>
          </div>
          <p className="text-sm" style={{ color: "#52525b" }}>
            La tabla queda para consulta rapida. Las operaciones fuertes siguen en el detalle del producto.
          </p>
        </div>
      </section>

      <ProductFilters
        categorias={categorias}
        categoria_actual={categoria_filter}
        estado_actual={estado_filter}
        stock_actual={stock_filter}
        q_actual={searchParams?.q ?? ""}
      />

      {total_filtrados === 0 && (q || categoria_filter || estado_filter || stock_filter) ? (
        <div className="rounded-2xl px-6 py-12 text-center text-sm" style={{ ...C, color: "#52525b" }}>
          No hay productos que coincidan con los filtros aplicados.
        </div>
      ) : (
        <>
          <ProductTable productos={productos_pagina} />
          <ProductPagination page={page} total={total_filtrados} page_size={PAGE_SIZE} base_href={pagination_base} />
        </>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: "#3f3f46" }}>
              Movimientos
            </p>
            <h2 className="text-xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
              {producto_filtrado ? "Kardex del producto" : "Ultimos movimientos"}
            </h2>
          </div>
          {!movements_available ? (
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
            >
              Historial no disponible en este entorno
            </span>
          ) : null}
        </div>

        {movements_available ? (
          <MovementHistory movimientos={movimientos} producto_filtrado={producto_filtrado} />
        ) : (
          <div className="rounded-2xl px-6 py-5 text-sm" style={{ ...C, color: "#71717a" }}>
            El historial de movimientos no esta disponible en este sandbox todavia. La vista sigue operativa para
            catalogo, filtros y salto al detalle del producto.
          </div>
        )}
      </section>
    </div>
  );
}
