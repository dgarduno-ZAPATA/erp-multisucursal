import Link from "next/link";

import { getClientes } from "@/actions/clientes";
import { ClientesTable } from "@/components/clientes/clientes-table";
import { require_roles } from "@/lib/auth/rbac";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

const S = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };

export default async function ClientesPage() {
  await require_roles(["admin", "gerente"]);
  const clientes = await getClientes();

  const total_ltv     = clientes.reduce((s, c) => s + c.ltv, 0);
  const con_compras   = clientes.filter((c) => c.total_compras > 0);
  const ticket_promedio =
    con_compras.length > 0
      ? con_compras.reduce((s, c) => s + c.ltv, 0) / con_compras.reduce((s, c) => s + c.total_compras, 0)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>CRM</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Clientes</h1>
            <p className="mt-1 max-w-xl text-sm leading-6" style={{ color: "#52525b" }}>
              Base de clientes, historial de compras y valor de vida del cliente (LTV).
            </p>
          </div>
          <Link
            href="/clientes/nuevo"
            className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: "#f59e0b", color: "#0c0c0e" }}
          >
            + Nuevo cliente
          </Link>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Clientes registrados",
            value: clientes.length,
            note: `${con_compras.length} con al menos una compra`,
            color: "#38bdf8",
          },
          {
            label: "LTV total",
            value: currency.format(total_ltv),
            note: "Ingreso acumulado de clientes registrados",
            color: "#34d399",
          },
          {
            label: "Ticket promedio",
            value: currency.format(ticket_promedio),
            note: "Promedio por transacción",
            color: "#f59e0b",
          },
        ].map((k) => (
          <article key={k.label} className="rounded-2xl p-5" style={C}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: k.color + "99" }}>{k.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight" style={{ color: k.color }}>{k.value}</p>
            <p className="mt-1 text-sm" style={{ color: "#3f3f46" }}>{k.note}</p>
          </article>
        ))}
      </section>

      {/* Table */}
      <ClientesTable clientes={clientes} />
    </div>
  );
}
