import { getDashboardMetrics } from "@/actions/dashboard";
import { getSalesGoalsSummary } from "@/actions/metas";
import { PrintPdfButton } from "@/components/dashboard/print-pdf-button";
import { require_roles } from "@/lib/auth/rbac";

type DashboardPdfPageProps = {
  searchParams?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    sucursal_id?: string;
    vendedor_id?: string;
  };
};

const currency_formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function format_pct(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value}%`;
}

export default async function DashboardPdfPage({ searchParams }: DashboardPdfPageProps) {
  await require_roles(["admin", "gerente"]);

  const sucursal_id = searchParams?.sucursal_id ? Number(searchParams.sucursal_id) : undefined;
  const filters = {
    fecha_desde: searchParams?.fecha_desde,
    fecha_hasta: searchParams?.fecha_hasta,
    sucursal_id: Number.isInteger(sucursal_id) ? sucursal_id : undefined,
    vendedor_id: searchParams?.vendedor_id || undefined,
  };

  const [metrics, goals] = await Promise.all([
    getDashboardMetrics(filters),
    getSalesGoalsSummary(filters),
  ]);

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Dashboard Ejecutivo
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reporte gerencial</h1>
          </div>
          <PrintPdfButton />
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Resumen del filtro
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Vista de dirección</h2>
              <p className="mt-2 text-sm text-slate-500">
                Desde {metrics.filtros.fecha_desde} hasta {metrics.filtros.fecha_hasta}
              </p>
            </div>
            <div className="text-sm text-slate-500">
              <div>Sucursal: {metrics.catalogos.sucursales.find((item) => item.id === metrics.filtros.sucursal_id)?.nombre ?? "Todas"}</div>
              <div>Operador: {metrics.catalogos.vendedores.find((item) => item.id === metrics.filtros.vendedor_id)?.nombre ?? "Todos"}</div>
              <div>Emitido: {new Date().toLocaleString("es-MX")}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Ventas periodo</div>
              <div className="mt-2 text-2xl font-semibold">{currency_formatter.format(metrics.resumen.total_periodo)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Margen estimado</div>
              <div className="mt-2 text-2xl font-semibold">{currency_formatter.format(metrics.resumen.margen_estimado)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Proyección cierre mes</div>
              <div className="mt-2 text-2xl font-semibold">{currency_formatter.format(metrics.resumen.proyeccion_cierre_mes)}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Cumplimiento promedio</div>
              <div className="mt-2 text-2xl font-semibold">{goals.resumen.cumplimiento_promedio}%</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Comparativos</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Sucursales</h2>
            <div className="mt-4 space-y-3">
              {metrics.comparativa_sucursales.map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="text-sm font-semibold">{format_pct(item.comparativo)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Actual {currency_formatter.format(item.total)} | Anterior {currency_formatter.format(item.total_anterior)}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Comparativos</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Operadores</h2>
            <div className="mt-4 space-y-3">
              {metrics.rendimiento_vendedores.slice(0, 8).map((item) => (
                <div key={item.usuario_id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.nombre}</span>
                    <span className="text-sm font-semibold">{format_pct(item.comparativo)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    Actual {currency_formatter.format(item.total)} | Anterior {currency_formatter.format(item.total_anterior)}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Metas</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Top cumplimiento</h2>
            <div className="mt-4 space-y-3">
              {goals.ranking.map((item, index) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">#{index + 1} {item.nombre}</span>
                    <span className="text-sm font-semibold">{item.porcentaje}%</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {currency_formatter.format(item.monto_actual)} de {currency_formatter.format(item.monto_objetivo)}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Caja</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Cierres recientes</h2>
            <div className="mt-4 space-y-3">
              {metrics.cierres_caja.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{item.sucursal_nombre}</span>
                    <span className="text-sm font-semibold">{currency_formatter.format(item.diferencia ?? 0)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.operador_nombre} | {item.fecha_operativa} | esperado {currency_formatter.format(item.monto_esperado ?? item.monto_inicial)}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
