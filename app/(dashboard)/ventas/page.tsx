import { getVentas } from "@/actions/ventas";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { can_cancel_sales, require_roles } from "@/lib/auth/rbac";
import { CancelSaleButton } from "@/components/ventas/cancel-sale-button";

type VentasPageProps = {
  searchParams?: {
    sucursal_id?: string;
    estado?: string;
  };
};

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const S = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const TH = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "px-4 py-4 text-sm";

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    cancelada:  { bg: "rgba(248,113,113,0.1)",  color: "#f87171" },
    pendiente:  { bg: "rgba(245,158,11,0.1)",   color: "#f59e0b" },
    completada: { bg: "rgba(52,211,153,0.1)",   color: "#34d399" },
  };
  const s = styles[estado] ?? styles.completada;
  return (
    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize"
      style={{ background: s.bg, color: s.color }}>
      {estado}
    </span>
  );
}

export default async function VentasPage({ searchParams }: VentasPageProps) {
  await require_roles(["admin", "gerente"]);
  const { sucursales, db_user } = await get_accessible_sucursales();
  const can_cancel = can_cancel_sales(db_user?.rol);
  const sucursal_id = searchParams?.sucursal_id ? Number(searchParams.sucursal_id) : undefined;
  const estado =
    searchParams?.estado === "pendiente" || searchParams?.estado === "completada" || searchParams?.estado === "cancelada"
      ? searchParams.estado
      : undefined;

  const ventas = await getVentas({
    sucursal_id: Number.isInteger(sucursal_id) ? sucursal_id : undefined,
    estado,
    limit: 50,
  });

  const completadas     = ventas.filter((v) => v.estado === "completada");
  const canceladas      = ventas.filter((v) => v.estado === "cancelada");
  const total_facturado = ventas.filter((v) => v.estado !== "cancelada").reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Operaciones</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Ventas</h1>
            <p className="mt-1 max-w-xl text-sm leading-6" style={{ color: "#52525b" }}>
              Historial operativo — tickets, filtros por sucursal y cancelaciones con reversa de inventario.
            </p>
          </div>
          <form className="flex flex-wrap gap-2">
            <select name="sucursal_id" defaultValue={sucursal_id ? String(sucursal_id) : ""}
              className="rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa", colorScheme: "dark" }}>
              <option value="">Todas las sucursales</option>
              {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select name="estado" defaultValue={estado ?? ""}
              className="rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa", colorScheme: "dark" }}>
              <option value="">Todos los estados</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
              <option value="pendiente">Pendientes</option>
            </select>
            <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "#f59e0b", color: "#0c0c0e" }}>
              Filtrar
            </button>
          </form>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Facturado",   value: fmt.format(total_facturado), note: "Excluyendo canceladas",                               color: "#34d399" },
          { label: "Completadas", value: String(completadas.length),  note: "Tickets listos para consulta",                         color: "#38bdf8" },
          { label: "Canceladas",  value: String(canceladas.length),   note: "Reversiones de inventario registradas",                 color: "#f87171" },
        ].map((k) => (
          <article key={k.label} className="rounded-2xl p-5" style={C}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: k.color + "99" }}>{k.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</p>
            <p className="mt-1 text-sm" style={{ color: "#3f3f46" }}>{k.note}</p>
          </article>
        ))}
      </section>

      {/* Table */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#fafaf9" }}>Últimas ventas</h2>
            <p className="mt-0.5 text-sm" style={{ color: "#52525b" }}>
              Perfil: {db_user?.rol ?? "sin rol"}
            </p>
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
            {ventas.length} registros
          </span>
        </div>

        {ventas.length === 0 ? (
          <div className="rounded-xl py-12 text-center text-sm" style={{ ...C, color: "#52525b" }}>
            No hay ventas que coincidan con el filtro actual.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <tr>
                  {["Folio", "Sucursal", "Fecha", "Items", "Pago", "Total", "Estado", "Acción"].map((h) => (
                    <th key={h} className={TH} style={{ color: "#3f3f46" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ventas.map((venta) => (
                  <tr key={venta.id} className="align-top" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className={TD}>
                      <div className="font-mono font-semibold" style={{ color: "#fafaf9" }}>{venta.folio}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#52525b" }}>
                        {venta.usuario.nombre}{venta.cliente ? ` · ${venta.cliente.nombre}` : ""}
                      </div>
                    </td>
                    <td className={TD} style={{ color: "#a1a1aa" }}>{venta.sucursal.nombre}</td>
                    <td className={`${TD} whitespace-nowrap text-xs`} style={{ color: "#71717a" }}>
                      {DATE_FORMAT.format(new Date(venta.fecha_venta))}
                    </td>
                    <td className={TD}>
                      <div className="space-y-1">
                        {venta.detalle_venta.map((d) => (
                          <div key={d.id}>
                            <span className="font-medium" style={{ color: "#fafaf9" }}>{d.producto.nombre}</span>
                            <span className="text-xs ml-1" style={{ color: "#52525b" }}>x{d.cantidad} · {d.producto.sku}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className={`${TD} capitalize`} style={{ color: "#a1a1aa" }}>{venta.metodo_pago}</td>
                    <td className={`${TD} font-bold`} style={{ color: "#34d399" }}>{fmt.format(venta.total)}</td>
                    <td className={TD}><EstadoBadge estado={venta.estado} /></td>
                    <td className={TD}>
                      <CancelSaleButton
                        venta_id={venta.id}
                        folio={venta.folio}
                        disabled={venta.estado === "cancelada"}
                        can_cancel={can_cancel}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
