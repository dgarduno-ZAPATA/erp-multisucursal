import Link from "next/link";
import { notFound } from "next/navigation";

import { getProveedor } from "@/actions/proveedores";
import { getProductos } from "@/actions/productos";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { AsignarProductoForm } from "@/components/proveedores/asignar-producto-form";
import { OrdenesPanel } from "@/components/proveedores/ordenes-panel";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });

const S  = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C  = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const TH = "pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "py-3 pr-4 text-sm";

type Props = { params: { id: string } };

export default async function ProveedorDetallePage({ params }: Props) {
  await require_roles(["admin", "gerente"]);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [proveedor, productos_raw, access] = await Promise.all([
    getProveedor(id),
    getProductos(),
    get_accessible_sucursales(),
  ]);

  if (!proveedor) notFound();

  const productos_catalogo = productos_raw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    categoria: p.categoria ?? "General",
  }));

  const sucursales = access.sucursales.map((s) => ({ id: s.id, nombre: s.nombre }));

  const pendientes = proveedor.ordenes_compra.filter((o) => o.estado === "pendiente").length;
  const vencidas   = proveedor.ordenes_compra.filter((o) => o.vencida).length;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/inventario/proveedores"
          className="transition-colors"
          style={{ color: "#52525b" }}
          onMouseEnter={undefined}>
          Proveedores
        </Link>
        <span style={{ color: "#3f3f46" }}>/</span>
        <span style={{ color: "#a1a1aa" }}>{proveedor.nombre}</span>
      </div>

      {/* Header */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>
              Compras · Proveedor
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
              {proveedor.nombre}
            </h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: "#71717a" }}>
              {proveedor.contacto  && <span>👤 {proveedor.contacto}</span>}
              {proveedor.telefono  && <span>📞 {proveedor.telefono}</span>}
              {proveedor.email     && <span>✉ {proveedor.email}</span>}
              {proveedor.direccion && <span>📍 {proveedor.direccion}</span>}
            </div>
            {proveedor.notas && (
              <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: "#52525b" }}>
                {proveedor.notas}
              </p>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Saldo pendiente",
              value: currency.format(proveedor.saldo_pendiente),
              color: proveedor.saldo_pendiente > 0 ? "#f59e0b" : "#34d399",
            },
            {
              label: "Días de crédito",
              value: proveedor.dias_credito > 0 ? `${proveedor.dias_credito} días` : "Contado",
              color: "#fafaf9",
            },
            {
              label: "Próxima visita",
              value: proveedor.proxima_visita
                ? DATE_FORMAT.format(new Date(`${proveedor.proxima_visita}T00:00:00`))
                : "—",
              color: "#38bdf8",
            },
            {
              label: "Visita cada",
              value: proveedor.frecuencia_visita ? `${proveedor.frecuencia_visita} días` : "—",
              color: "#fafaf9",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl p-4" style={C}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3f3f46" }}>
                {kpi.label}
              </p>
              <p className="mt-2 text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Alertas */}
        {(vencidas > 0 || pendientes > 0 || proveedor.monto_minimo_pedido !== null) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {vencidas > 0 && (
              <span className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
                ⚠ {vencidas} {vencidas === 1 ? "deuda vencida" : "deudas vencidas"}
              </span>
            )}
            {pendientes > 0 && (
              <span className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                {pendientes} {pendientes === 1 ? "orden pendiente" : "órdenes pendientes"}
              </span>
            )}
            {proveedor.monto_minimo_pedido !== null && (
              <span className="rounded-xl px-4 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
                Pedido mínimo: {currency.format(proveedor.monto_minimo_pedido)}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Órdenes de compra */}
      <section className="rounded-2xl p-6" style={S}>
        <h2 className="mb-5 text-lg font-bold" style={{ color: "#fafaf9" }}>Órdenes de compra</h2>
        <OrdenesPanel
          proveedor_id={proveedor.id}
          proveedor_nombre={proveedor.nombre}
          monto_minimo={proveedor.monto_minimo_pedido}
          ordenes={proveedor.ordenes_compra}
          sucursales={sucursales}
          productos={productos_catalogo}
        />
      </section>

      {/* Productos que provee */}
      <section className="rounded-2xl p-6" style={S}>
        <h2 className="mb-5 text-lg font-bold" style={{ color: "#fafaf9" }}>Productos que provee</h2>
        <AsignarProductoForm
          proveedor_id={proveedor.id}
          productos_catalogo={productos_catalogo}
          productos_asignados={proveedor.productos.map((p) => ({
            producto_id: p.producto_id,
            precio_costo: p.precio_costo ? Number(p.precio_costo) : null,
            es_principal: p.es_principal,
            producto: p.producto,
          }))}
        />
      </section>

      {/* Historial de precios */}
      {proveedor.historial_precios.length > 0 && (
        <section className="rounded-2xl p-6" style={S}>
          <h2 className="mb-5 text-lg font-bold" style={{ color: "#fafaf9" }}>Historial de cambios de precio</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <tr>
                  {["Producto", "Precio anterior", "Precio nuevo", "Variación", "Fecha"].map((h, i) => (
                    <th key={h} className={`${TH}${i >= 1 ? " text-right" : ""}`} style={{ color: "#3f3f46" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedor.historial_precios.map((h) => {
                  const variacion = h.precio_anterior > 0
                    ? Math.round(((h.precio_nuevo - h.precio_anterior) / h.precio_anterior) * 100)
                    : null;
                  const subio = (variacion ?? 0) > 0;
                  return (
                    <tr key={h.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className={TD} style={{ color: "#a1a1aa" }}>{h.producto.nombre}</td>
                      <td className={`${TD} text-right`} style={{ color: "#71717a" }}>
                        {currency.format(h.precio_anterior)}
                      </td>
                      <td className={`${TD} text-right font-bold`} style={{ color: "#fafaf9" }}>
                        {currency.format(h.precio_nuevo)}
                      </td>
                      <td className={`${TD} text-right`}>
                        {variacion !== null && (
                          <span className="text-xs font-bold" style={{ color: subio ? "#f87171" : "#34d399" }}>
                            {subio ? "▲" : "▼"} {Math.abs(variacion)}%
                          </span>
                        )}
                      </td>
                      <td className={TD} style={{ color: "#52525b" }}>{h.created_at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
