import { notFound } from "next/navigation";
import Link from "next/link";

import { getClienteById } from "@/actions/clientes";
import { require_roles } from "@/lib/auth/rbac";
import { EditClienteForm } from "@/components/clientes/edit-cliente-form";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type ClientePageProps = {
  params: { id: string };
};

export default async function ClientePage({ params }: ClientePageProps) {
  await require_roles(["admin", "gerente"]);
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const cliente = await getClienteById(id);
  if (!cliente) notFound();

  const primera_compra =
    cliente.ventas.length > 0
      ? new Date(cliente.ventas[cliente.ventas.length - 1].fecha_venta)
      : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/clientes" className="hover:text-slate-300">
          Clientes
        </Link>
        <span>/</span>
        <span className="text-slate-300">{cliente.nombre}</span>
      </div>

      {/* Header */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-2xl font-bold text-slate-200">
              {cliente.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/70">
                CRM · Cliente
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {cliente.nombre}
              </h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-400">
                {cliente.email && <span>{cliente.email}</span>}
                {cliente.telefono && <span>{cliente.telefono}</span>}
                {cliente.direccion && <span>{cliente.direccion}</span>}
              </div>
            </div>
          </div>

          <EditClienteForm cliente={cliente} />
        </div>

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">LTV total</p>
            <p className="mt-1 text-xl font-semibold text-emerald-300">
              {currency.format(cliente.ltv)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Compras</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {cliente.total_compras}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Ticket promedio</p>
            <p className="mt-1 text-xl font-semibold text-sky-300">
              {currency.format(cliente.ticket_promedio)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Cliente desde</p>
            <p className="mt-1 text-sm font-semibold text-slate-300">
              {primera_compra ? DATE.format(primera_compra) : "Sin compras"}
            </p>
          </div>
        </div>
      </section>

      {/* Historial de compras */}
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          Historial de compras
        </h2>

        {cliente.ventas.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
            Sin compras registradas para este cliente.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {cliente.ventas.map((v) => (
              <article
                key={v.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{v.folio}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {DATE.format(new Date(v.fecha_venta))} · {v.sucursal_nombre}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-300">
                      {currency.format(v.total)}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-slate-500">
                      {v.metodo_pago}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
                  {v.items.map((item) => (
                    <div
                      key={item.sku}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">
                        {item.nombre}{" "}
                        <span className="text-slate-600">×{item.cantidad}</span>
                      </span>
                      <span className="text-slate-400">
                        {currency.format(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
