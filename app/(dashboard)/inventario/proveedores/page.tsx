import Link from "next/link";

import { getProveedores } from "@/actions/proveedores";
import { require_roles } from "@/lib/auth/rbac";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });

const S  = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C  = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const TH = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "px-4 py-4 text-sm";

function SaldoBadge({ saldo, vencidas }: { saldo: number; vencidas: number }) {
  if (vencidas > 0) return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}>
      ⚠ {currency.format(saldo)}
    </span>
  );
  if (saldo > 0) return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold"
      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
      {currency.format(saldo)}
    </span>
  );
  return <span className="text-xs font-semibold" style={{ color: "#34d399" }}>Al corriente</span>;
}

export default async function ProveedoresPage() {
  await require_roles(["admin", "gerente"]);
  const proveedores = await getProveedores();

  const total_saldo = proveedores.reduce((acc, p) => acc + p.saldo_pendiente, 0);
  const con_deuda   = proveedores.filter((p) => p.saldo_pendiente > 0).length;
  const vencidos    = proveedores.filter((p) => p.ordenes_vencidas > 0).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Compras</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Proveedores</h1>
            <p className="mt-1 max-w-xl text-sm leading-6" style={{ color: "#52525b" }}>
              Gestión de proveedores, órdenes de compra y cuentas por pagar.
            </p>
          </div>
          <Link
            href="/inventario/proveedores/nuevo"
            className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: "#f59e0b", color: "#0c0c0e" }}
          >
            + Nuevo proveedor
          </Link>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total proveedores",    value: proveedores.length,          color: "#fafaf9" },
            { label: "Saldo por pagar",      value: currency.format(total_saldo), color: "#f59e0b" },
            { label: "Con deuda activa",     value: con_deuda,                   color: "#f59e0b" },
            { label: "Deudas vencidas",      value: vencidos,                    color: vencidos > 0 ? "#f87171" : "#34d399" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl p-4" style={C}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3f3f46" }}>{k.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tabla */}
      <section className="rounded-2xl p-6" style={S}>
        {proveedores.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm" style={{ color: "#52525b" }}>No hay proveedores registrados.</p>
            <Link href="/inventario/proveedores/nuevo"
              className="mt-3 inline-block text-sm font-semibold" style={{ color: "#f59e0b" }}>
              Registrar primer proveedor →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <tr>
                  {["Proveedor", "Contacto", "Productos", "Crédito", "Próxima visita", "Saldo", ""].map((h, i) => (
                    <th key={`${h}-${i}`} className={`${TH}${i === 2 || i === 3 ? " text-center" : ""}`}
                      style={{ color: "#3f3f46" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr key={p.id} className="transition"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className={TD}>
                      <p className="font-bold" style={{ color: "#fafaf9" }}>{p.nombre}</p>
                      {p.email && <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{p.email}</p>}
                    </td>
                    <td className={TD} style={{ color: "#a1a1aa" }}>
                      {p.contacto ?? "—"}
                      {p.telefono && <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>{p.telefono}</p>}
                    </td>
                    <td className={`${TD} text-center font-semibold`} style={{ color: "#a1a1aa" }}>{p.total_productos}</td>
                    <td className={`${TD} text-center`} style={{ color: "#a1a1aa" }}>
                      {p.dias_credito > 0 ? `${p.dias_credito} días` : "Contado"}
                    </td>
                    <td className={TD} style={{ color: "#71717a" }}>
                      {p.proxima_visita
                        ? DATE_FORMAT.format(new Date(`${p.proxima_visita}T00:00:00`))
                        : "—"}
                    </td>
                    <td className={TD}>
                      <SaldoBadge saldo={p.saldo_pendiente} vencidas={p.ordenes_vencidas} />
                    </td>
                    <td className={TD}>
                      <Link href={`/inventario/proveedores/${p.id}`}
                        className="text-xs font-bold transition-colors"
                        style={{ color: "#f59e0b" }}>
                        Ver →
                      </Link>
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
