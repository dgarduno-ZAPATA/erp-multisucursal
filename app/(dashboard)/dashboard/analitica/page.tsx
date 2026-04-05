import { getDashboardMetrics } from "@/actions/dashboard";
import { getSalesGoalsSummary } from "@/actions/metas";
import { GoalsPanel } from "@/components/dashboard/goals-panel";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { require_roles } from "@/lib/auth/rbac";

type AnalyticsTab = "direccion" | "ventas" | "caja" | "metas" | "inventario";

type AnalyticsPageProps = {
  searchParams?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    sucursal_id?: string;
    vendedor_id?: string;
    vista?: string;
  };
};

const fmt   = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const pct   = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const S  = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C  = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const C2 = { border: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" };
const TH = "pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "py-3 pr-4 text-sm";

/* ───── helpers date ───── */
function start_of_day(d: Date) { const n = new Date(d); n.setHours(0,0,0,0); return n; }
function end_of_day(d: Date)   { const n = new Date(d); n.setHours(23,59,59,999); return n; }
function start_of_week(d: Date) {
  const n = new Date(d);
  const day = n.getDay();
  n.setDate(n.getDate() + (day === 0 ? -6 : 1 - day));
  n.setHours(0,0,0,0);
  return n;
}
function start_of_month(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function build_query(f: { fecha_desde: string; fecha_hasta: string; sucursal_id: number | null | undefined; vendedor_id: string | null | undefined; vista?: string }) {
  const p = new URLSearchParams();
  p.set("fecha_desde", f.fecha_desde);
  p.set("fecha_hasta", f.fecha_hasta);
  if (f.sucursal_id) p.set("sucursal_id", String(f.sucursal_id));
  if (f.vendedor_id) p.set("vendedor_id", f.vendedor_id);
  if (f.vista)       p.set("vista", f.vista);
  return p.toString();
}

function compare(a: number, b: number): number | null {
  if (b <= 0) return null;
  return Math.round(((a - b) / b) * 100);
}

/* ───── delta style ───── */
function delta_style(value: number | null): React.CSSProperties {
  if (value === null) return { color: "#52525b" };
  if (value > 0) return { color: "#34d399" };
  if (value < 0) return { color: "#f87171" };
  return { color: "#71717a" };
}

/* ───── health style ───── */
type HealthStatus = "saludable" | "vigilancia" | "critica";
function health_style(s: HealthStatus): React.CSSProperties {
  if (s === "saludable") return { background: "rgba(52,211,153,0.08)",  border: "1px solid rgba(52,211,153,0.18)",  color: "#34d399" };
  if (s === "vigilancia") return { background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", color: "#f59e0b" };
  return                          { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#f87171" };
}
function health_label(s: HealthStatus) {
  return s === "saludable" ? "Saludable" : s === "vigilancia" ? "Vigilancia" : "Crítica";
}

/* ───── sub-components ───── */
function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-xl p-5" style={C}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>{value}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: "#52525b" }}>{note}</p>
    </article>
  );
}

function DeltaText({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs" style={{ color: "#52525b" }}>Sin base comparativa</span>;
  return (
    <span className="text-xs font-bold" style={delta_style(value)}>
      {value > 0 ? "+" : ""}{pct.format(value)}% vs anterior
    </span>
  );
}

function HealthCard({ title, status, value, note }: { title: string; status: HealthStatus; value: string; note: string }) {
  const st = health_style(status);
  return (
    <article className="rounded-xl p-5" style={st}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "currentColor", opacity: 0.6 }}>{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }}>
          {health_label(status)}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5" style={{ opacity: 0.7 }}>{note}</p>
    </article>
  );
}

function CompareCard({ title, current, previous, delta, note }: { title: string; current: string; previous: string; delta: number | null; note: string }) {
  return (
    <article className="rounded-xl p-5" style={C}>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>{current}</p>
          <p className="mt-1 text-xs" style={{ color: "#52525b" }}>Anterior {previous}</p>
        </div>
        <p className="text-sm font-bold" style={delta_style(delta)}>
          {delta === null ? "N/D" : `${delta > 0 ? "+" : ""}${pct.format(delta)}%`}
        </p>
      </div>
      <p className="mt-3 text-xs leading-5" style={{ color: "#52525b" }}>{note}</p>
    </article>
  );
}

function ComparisonBars({
  title,
  items,
  current_label = "Actual",
  previous_label = "Anterior",
  value_formatter = (v: number) => String(v),
}: {
  title: string;
  items: { label: string; current: number; previous: number; delta: number | null }[];
  current_label?: string;
  previous_label?: string;
  value_formatter?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.flatMap((i) => [i.current, i.previous]));
  return (
    <article className="rounded-xl p-6" style={S}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>{title}</p>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl p-4" style={C}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold" style={{ color: "#fafaf9" }}>{item.label}</p>
                <DeltaText value={item.delta} />
              </div>
              <div className="text-right text-xs" style={{ color: "#52525b" }}>
                <div>{current_label}: {value_formatter(item.current)}</div>
                <div>{previous_label}: {value_formatter(item.previous)}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em]" style={{ color: "#3f3f46" }}>
                  <span>{current_label}</span><span>{value_formatter(item.current)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (item.current / max) * 100)}%`, background: "#f59e0b" }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em]" style={{ color: "#3f3f46" }}>
                  <span>{previous_label}</span><span>{value_formatter(item.previous)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(4, (item.previous / max) * 100)}%`, background: "rgba(255,255,255,0.18)" }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

/* ───── main page ───── */
export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  await require_roles(["admin", "gerente"]);

  const sucursal_id = searchParams?.sucursal_id ? Number(searchParams.sucursal_id) : undefined;
  const requested_tab = searchParams?.vista;
  const current_tab: AnalyticsTab =
    requested_tab === "ventas" || requested_tab === "caja" || requested_tab === "metas" || requested_tab === "inventario"
      ? requested_tab
      : "direccion";

  const filters = {
    fecha_desde:  searchParams?.fecha_desde,
    fecha_hasta:  searchParams?.fecha_hasta,
    sucursal_id:  Number.isInteger(sucursal_id) ? sucursal_id : undefined,
    vendedor_id:  searchParams?.vendedor_id || undefined,
  };

  const [metrics, goals] = await Promise.all([getDashboardMetrics(filters), getSalesGoalsSummary(filters)]);

  const { filtros, catalogos, resumen } = metrics;
  const today = new Date();
  const quick_ranges = [
    { label: "Hoy",    from: start_of_day(today).toISOString().slice(0, 10),  to: end_of_day(today).toISOString().slice(0, 10) },
    { label: "Semana", from: start_of_week(today).toISOString().slice(0, 10), to: end_of_day(today).toISOString().slice(0, 10) },
    { label: "Mes",    from: start_of_month(today).toISOString().slice(0, 10), to: end_of_day(today).toISOString().slice(0, 10) },
  ];
  const base_query = build_query({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta, sucursal_id: filtros.sucursal_id, vendedor_id: filtros.vendedor_id });

  const sales_health: HealthStatus =
    resumen.comparativo_semana !== null && resumen.comparativo_semana < -10 ? "critica"
    : resumen.comparativo_semana !== null && resumen.comparativo_semana < 5  ? "vigilancia"
    : "saludable";
  const goals_health: HealthStatus =
    goals.resumen.criticas > 0                              ? "critica"
    : goals.resumen.cumplimiento_promedio < 75             ? "vigilancia"
    : "saludable";
  const cash_health: HealthStatus =
    metrics.resumen_caja.cierres_con_diferencia >= 3       ? "critica"
    : metrics.resumen_caja.cierres_con_diferencia > 0      ? "vigilancia"
    : "saludable";
  const inventory_health: HealthStatus =
    metrics.productosEnRiesgo.length >= 5                  ? "critica"
    : metrics.productosEnRiesgo.length > 0 || resumen.faltantes_pendientes > 0 ? "vigilancia"
    : "saludable";

  const executive_alerts = [
    metrics.resumen_caja.cajas_abiertas > 0 ? `${metrics.resumen_caja.cajas_abiertas} caja(s) siguen abiertas y requieren corte.` : null,
    goals.resumen.criticas > 0              ? `${goals.resumen.criticas} meta(s) están en estado crítico.`                       : null,
    metrics.productosEnRiesgo.length > 0    ? `${metrics.productosEnRiesgo.length} producto(s) están en riesgo de stock.`        : null,
    resumen.cancelaciones_count > 0         ? `${resumen.cancelaciones_count} cancelación(es) requieren seguimiento.`           : null,
  ].filter((item): item is string => Boolean(item));

  const tabs: { id: AnalyticsTab; label: string; description: string }[] = [
    { id: "direccion",  label: "Dirección",  description: "Resumen ejecutivo" },
    { id: "ventas",     label: "Ventas",     description: "Productos y operadores" },
    { id: "caja",       label: "Caja",       description: "Cierres y diferencias" },
    { id: "metas",      label: "Metas",      description: "Ranking y avance" },
    { id: "inventario", label: "Inventario", description: "Margen y riesgo" },
  ];

  const INPUT_STYLE = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#a1a1aa",
    colorScheme: "dark" as const,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg,#100e00 0%,#111114 55%,#111114 100%)", border: "1px solid rgba(245,158,11,0.12)" }}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "rgba(245,158,11,0.5)" }}>
              Centro de análisis
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Analítica gerencial</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: "#52525b" }}>
              Vista dedicada para dirección y gerencia — lectura comercial, caja, metas e inventario.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/dashboard?${base_query}`}
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa" }}>
              ← Dashboard
            </a>
            <a href={`/api/v1/dashboard/export?${build_query({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta, sucursal_id: filtros.sucursal_id, vendedor_id: filtros.vendedor_id, vista: current_tab === "direccion" ? undefined : current_tab })}`}
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
              ↓ Exportar Excel
            </a>
            <a href={`/dashboard/pdf?${base_query}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#a1a1aa" }}>
              PDF
            </a>
          </div>
        </div>

        {/* Filtros */}
        <form className="mt-5 flex flex-wrap gap-2">
          <input type="date" name="fecha_desde" defaultValue={filtros.fecha_desde}
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
          <input type="date" name="fecha_hasta" defaultValue={filtros.fecha_hasta}
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
          <select name="sucursal_id" defaultValue={filtros.sucursal_id ? String(filtros.sucursal_id) : ""}
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
            <option value="">Todas las sucursales</option>
            {catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select name="vendedor_id" defaultValue={filtros.vendedor_id ?? ""}
            className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
            <option value="">Todos los operadores</option>
            {catalogos.vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre} | {v.rol}</option>)}
          </select>
          <input type="hidden" name="vista" value={current_tab} />
          <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ background: "#f59e0b", color: "#0c0c0e" }}>
            Aplicar
          </button>
        </form>

        {/* Tabs */}
        <div className="mt-5 grid gap-2 xl:grid-cols-5">
          {tabs.map((tab) => (
            <a key={tab.id}
              href={`/dashboard/analitica?${build_query({ fecha_desde: filtros.fecha_desde, fecha_hasta: filtros.fecha_hasta, sucursal_id: filtros.sucursal_id, vendedor_id: filtros.vendedor_id, vista: tab.id })}`}
              className="rounded-xl px-4 py-4 text-left"
              style={current_tab === tab.id
                ? { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm font-bold" style={{ color: current_tab === tab.id ? "#f59e0b" : "#a1a1aa" }}>{tab.label}</p>
              <p className="mt-1 text-xs leading-5" style={{ color: "#52525b" }}>{tab.description}</p>
            </a>
          ))}
        </div>

        {/* Quick ranges */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quick_ranges.map((range) => (
            <a key={range.label}
              href={`/dashboard/analitica?${build_query({ fecha_desde: range.from, fecha_hasta: range.to, sucursal_id: filtros.sucursal_id, vendedor_id: filtros.vendedor_id, vista: current_tab })}`}
              className="inline-flex items-center rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#71717a" }}>
              {range.label}
            </a>
          ))}
        </div>
      </section>

      {/* ── DIRECCIÓN ── */}
      {current_tab === "direccion" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-4">
            <HealthCard title="Ventas"     status={sales_health}     value={fmt.format(resumen.total_periodo)}                       note={`Semana ${resumen.comparativo_semana === null ? "sin base" : `${resumen.comparativo_semana > 0 ? "+" : ""}${pct.format(resumen.comparativo_semana)}%`} vs anterior.`} />
            <HealthCard title="Metas"      status={goals_health}     value={`${goals.resumen.cumplimiento_promedio}%`}               note={`${goals.resumen.metas_cumplidas} de ${goals.resumen.metas_activas} metas cumplidas.`} />
            <HealthCard title="Caja"       status={cash_health}      value={String(metrics.resumen_caja.cierres_con_diferencia).padStart(2,"0")} note={`${metrics.resumen_caja.cajas_abiertas} caja(s) abiertas · ${fmt.format(metrics.resumen_caja.diferencias_abs)} desviación.`} />
            <HealthCard title="Inventario" status={inventory_health} value={String(metrics.productosEnRiesgo.length).padStart(2,"0")} note={`${resumen.faltantes_pendientes} faltante(s) pendientes.`} />
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <SummaryCard label="Ventas del periodo"    value={fmt.format(resumen.total_periodo)}            note={`${resumen.transacciones_periodo} transacciones.`} />
            <SummaryCard label="Margen estimado"       value={fmt.format(resumen.margen_estimado)}          note="Antes de gasto fijo e impuestos." />
            <SummaryCard label="Proyección de cierre"  value={fmt.format(resumen.proyeccion_cierre_mes)}    note={`Run rate ${fmt.format(resumen.run_rate_diario)}/día.`} />
            <SummaryCard label="Cumplimiento promedio" value={`${goals.resumen.cumplimiento_promedio}%`}    note={`${goals.resumen.metas_cumplidas} metas cumplidas de ${goals.resumen.metas_activas}.`} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Pulso comercial</p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Últimos 7 días</h2>
              <SalesChart data={metrics.ventas_por_dia} />
            </article>

            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Lectura rápida</p>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Mejor sucursal",  value: resumen.sucursal_top?.nombre ?? "Sin datos",  sub: fmt.format(resumen.sucursal_top?.total ?? 0) },
                  { label: "Mejor operador",  value: resumen.vendedor_top?.nombre ?? "Sin datos",  sub: fmt.format(resumen.vendedor_top?.total ?? 0) },
                  {
                    label: "Proyección vs mes anterior",
                    value: resumen.comparativo_proyeccion_mes === null ? "N/D" : `${resumen.comparativo_proyeccion_mes > 0 ? "+" : ""}${pct.format(resumen.comparativo_proyeccion_mes)}%`,
                    sub: `Brecha ${fmt.format(resumen.brecha_ritmo_mes)}`,
                    delta: resumen.comparativo_proyeccion_mes,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl p-4" style={C}>
                    <p className="text-xs" style={{ color: "#52525b" }}>{item.label}</p>
                    <p className="mt-1.5 text-lg font-bold" style={{ ...("delta" in item ? delta_style(item.delta ?? null) : {}), ...(!("delta" in item) ? { color: "#fafaf9" } : {}) }}>
                      {item.value}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#52525b" }}>{item.sub}</p>
                  </div>
                ))}
                <div className="rounded-xl p-4" style={C}>
                  <p className="text-xs" style={{ color: "#52525b" }}>Agenda ejecutiva</p>
                  <div className="mt-3 space-y-2">
                    {executive_alerts.length === 0 ? (
                      <p className="text-sm font-semibold" style={{ color: "#34d399" }}>Sin focos rojos en este corte.</p>
                    ) : (
                      executive_alerts.map((alert) => (
                        <div key={alert} className="rounded-lg px-3 py-2 text-xs" style={C2}>
                          <span style={{ color: "#a1a1aa" }}>{alert}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Sucursales</p>
              <div className="mt-5 space-y-3">
                {metrics.comparativa_sucursales.slice(0, 6).map((s) => (
                  <div key={s.id} className="rounded-xl p-4" style={C}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{s.nombre}</p>
                        <DeltaText value={s.comparativo} />
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{fmt.format(s.total)}</p>
                        <p className="text-xs" style={{ color: "#52525b" }}>Antes {fmt.format(s.total_anterior)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Operadores</p>
              <div className="mt-5 space-y-3">
                {metrics.rendimiento_vendedores.slice(0, 6).map((o) => (
                  <div key={o.usuario_id} className="rounded-xl p-4" style={C}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{o.nombre}</p>
                        <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: "#3f3f46" }}>{o.rol} | {o.sucursal}</p>
                        <DeltaText value={o.comparativo} />
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{fmt.format(o.total)}</p>
                        <p className="text-xs" style={{ color: "#52525b" }}>Antes {fmt.format(o.total_anterior)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      )}

      {/* ── VENTAS ── */}
      {current_tab === "ventas" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-3">
            <CompareCard title="Ventas del periodo" current={fmt.format(metrics.comparativos_modulos.ventas.actual)} previous={fmt.format(metrics.comparativos_modulos.ventas.anterior)} delta={metrics.comparativos_modulos.ventas.delta} note="Comparativo general vs periodo anterior equivalente." />
            <CompareCard title="Margen estimado"    current={fmt.format(resumen.margen_estimado)}  previous={fmt.format(resumen.margen_estimado_anterior)} delta={metrics.comparativos_modulos.inventario.margen_delta} note="Lectura comercial del margen generado." />
            <CompareCard title="Cancelaciones"      current={String(resumen.cancelaciones_count).padStart(2,"0")} previous={String(resumen.cancelaciones_count_anterior).padStart(2,"0")} delta={compare(resumen.cancelaciones_count, resumen.cancelaciones_count_anterior)} note="Volumen de cancelaciones en el periodo." />
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <SummaryCard label="Ventas hoy"      value={fmt.format(resumen.ventas_hoy)}    note={`${resumen.transacciones_hoy} tickets hoy.`} />
            <SummaryCard label="Semana"           value={fmt.format(resumen.ventas_semana)} note={`${resumen.transacciones_semana} tickets semana.`} />
            <SummaryCard label="Mes"              value={fmt.format(resumen.ventas_mes)}    note={`${resumen.transacciones_mes} tickets mes.`} />
            <SummaryCard label="Ticket promedio"  value={fmt.format(resumen.ticket_promedio)} note="Promedio por transacción." />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Tendencia</p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Venta diaria</h2>
              <SalesChart data={metrics.ventas_por_dia} />
            </article>
            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Productos top</p>
              <div className="mt-5 space-y-3">
                {metrics.top_productos.slice(0, 8).map((p) => (
                  <div key={p.producto_id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={C}>
                    <div>
                      <p className="font-bold" style={{ color: "#fafaf9" }}>{p.nombre}</p>
                      <p className="text-xs" style={{ color: "#52525b" }}>{p.unidades} unidades</p>
                    </div>
                    <p className="font-bold" style={{ color: "#f59e0b" }}>{fmt.format(p.monto)}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ComparisonBars title="Sucursales comparadas"
              items={metrics.comparativa_sucursales.slice(0, 5).map((i) => ({ label: i.nombre, current: i.total, previous: i.total_anterior, delta: i.comparativo }))}
              value_formatter={(v) => fmt.format(v)} />
            <ComparisonBars title="Operadores comparados"
              items={metrics.rendimiento_vendedores.slice(0, 5).map((i) => ({ label: i.nombre, current: i.total, previous: i.total_anterior, delta: i.comparativo }))}
              value_formatter={(v) => fmt.format(v)} />
          </section>
        </div>
      )}

      {/* ── CAJA ── */}
      {current_tab === "caja" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-3">
            <CompareCard title="Cierres"             current={String(metrics.resumen_caja.cierres_count).padStart(2,"0")}           previous={String(metrics.resumen_caja.cierres_count_anterior).padStart(2,"0")}           delta={metrics.resumen_caja.comparativo_cierres}                                                                   note="Cortes registrados vs periodo anterior." />
            <CompareCard title="Diferencias"         current={String(metrics.resumen_caja.cierres_con_diferencia).padStart(2,"0")}  previous={String(metrics.resumen_caja.cierres_con_diferencia_anterior).padStart(2,"0")}  delta={compare(metrics.resumen_caja.cierres_con_diferencia, metrics.resumen_caja.cierres_con_diferencia_anterior)}    note="Cierres con sobrante o faltante detectado." />
            <CompareCard title="Desviación acumulada" current={fmt.format(metrics.resumen_caja.diferencias_abs)}                     previous={fmt.format(metrics.resumen_caja.diferencias_abs_anterior)}                     delta={compare(metrics.resumen_caja.diferencias_abs, metrics.resumen_caja.diferencias_abs_anterior)}                  note="Suma absoluta de diferencias de caja." />
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <SummaryCard label="Cierres analizados"  value={String(metrics.resumen_caja.cierres_count).padStart(2,"0")}           note="Cortes en el rango filtrado." />
            <SummaryCard label="Cajas abiertas"      value={String(metrics.resumen_caja.cajas_abiertas).padStart(2,"0")}          note="Turnos que aún no cierran." />
            <SummaryCard label="Con diferencia"      value={String(metrics.resumen_caja.cierres_con_diferencia).padStart(2,"0")}  note="Cierres con sobrante o faltante." />
            <SummaryCard label="Desviación"          value={fmt.format(metrics.resumen_caja.diferencias_abs)}                     note="Suma absoluta detectada." />
          </section>

          <section className="rounded-2xl p-6" style={S}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Auditoría de caja</p>
            <div className="mt-5 space-y-4">
              {metrics.cierres_caja.length === 0 ? (
                <div className="rounded-xl px-4 py-8 text-center text-sm" style={{ ...C, color: "#52525b" }}>
                  No hay cierres de caja en el rango actual.
                </div>
              ) : (
                metrics.cierres_caja.map((cierre) => (
                  <article key={cierre.id} className="rounded-xl p-4" style={C}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{cierre.sucursal_nombre} | {cierre.operador_nombre}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em]" style={{ color: "#3f3f46" }}>{cierre.operador_rol} | {cierre.fecha_operativa}</p>
                        <p className="mt-2 text-xs" style={{ color: "#52525b" }}>
                          Apertura: {new Date(cierre.hora_apertura).toLocaleString("es-MX")}
                          {cierre.hora_cierre ? ` | Cierre: ${new Date(cierre.hora_cierre).toLocaleString("es-MX")}` : " | Aún abierta"}
                        </p>
                      </div>
                      <div className="grid gap-0.5 text-right text-sm">
                        <p className="font-bold" style={{ color: "#fafaf9" }}>Esperado: {fmt.format(cierre.monto_esperado ?? 0)}</p>
                        <p style={{ color: "#a1a1aa" }}>Declarado: {fmt.format(cierre.monto_final_declarado ?? 0)}</p>
                        <p className="font-bold" style={delta_style(cierre.diferencia)}>Diferencia: {fmt.format(cierre.diferencia ?? 0)}</p>
                      </div>
                    </div>
                    {(cierre.observaciones_apertura || cierre.observaciones_cierre) && (
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-lg px-4 py-3 text-xs" style={C2}>
                          <span className="font-bold" style={{ color: "#a1a1aa" }}>Apertura:</span>{" "}
                          <span style={{ color: "#71717a" }}>{cierre.observaciones_apertura ?? "Sin comentario"}</span>
                        </div>
                        <div className="rounded-lg px-4 py-3 text-xs" style={C2}>
                          <span className="font-bold" style={{ color: "#a1a1aa" }}>Cierre:</span>{" "}
                          <span style={{ color: "#71717a" }}>{cierre.observaciones_cierre ?? "Sin comentario"}</span>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ComparisonBars title="Lectura comparativa de caja"
              items={[
                { label: "Cierres",            current: metrics.resumen_caja.cierres_count,          previous: metrics.resumen_caja.cierres_count_anterior,          delta: metrics.resumen_caja.comparativo_cierres },
                { label: "Con diferencia",     current: metrics.resumen_caja.cierres_con_diferencia,  previous: metrics.resumen_caja.cierres_con_diferencia_anterior,  delta: compare(metrics.resumen_caja.cierres_con_diferencia, metrics.resumen_caja.cierres_con_diferencia_anterior) },
                { label: "Desviación acum.",   current: metrics.resumen_caja.diferencias_abs,          previous: metrics.resumen_caja.diferencias_abs_anterior,          delta: compare(metrics.resumen_caja.diferencias_abs, metrics.resumen_caja.diferencias_abs_anterior) },
              ]}
              value_formatter={(v) => fmt.format(v)} />
            <ComparisonBars title="Estado operativo"
              items={[
                { label: "Cajas abiertas",  current: metrics.resumen_caja.cajas_abiertas, previous: metrics.resumen_caja.cajas_abiertas_anterior, delta: compare(metrics.resumen_caja.cajas_abiertas, metrics.resumen_caja.cajas_abiertas_anterior) },
                { label: "Cierres limpios", current: Math.max(0, metrics.resumen_caja.cierres_count - metrics.resumen_caja.cierres_con_diferencia), previous: Math.max(0, metrics.resumen_caja.cierres_count_anterior - metrics.resumen_caja.cierres_con_diferencia_anterior), delta: compare(Math.max(0, metrics.resumen_caja.cierres_count - metrics.resumen_caja.cierres_con_diferencia), Math.max(0, metrics.resumen_caja.cierres_count_anterior - metrics.resumen_caja.cierres_con_diferencia_anterior)) },
              ]} />
          </section>
        </div>
      )}

      {/* ── METAS ── */}
      {current_tab === "metas" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-3">
            <CompareCard title="Cumplimiento promedio" current={`${goals.resumen.cumplimiento_promedio}%`}           previous={`${goals.comparativo.resumen_anterior.cumplimiento_promedio}%`}                 delta={goals.comparativo.delta_cumplimiento}     note="Avance de metas activas vs periodo anterior." />
            <CompareCard title="Avance monetario"      current={fmt.format(goals.resumen.total_actual)}               previous={fmt.format(goals.comparativo.resumen_anterior.total_actual)}                   delta={goals.comparativo.delta_monto_actual}     note="Monto alcanzado por metas activas." />
            <CompareCard title="Metas cumplidas"       current={String(goals.resumen.metas_cumplidas).padStart(2,"0")} previous={String(goals.comparativo.resumen_anterior.metas_cumplidas).padStart(2,"0")}   delta={goals.comparativo.delta_metas_cumplidas}  note="Metas ya cerradas vs periodo anterior." />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ComparisonBars title="Cumplimiento de metas"
              items={[
                { label: "Cumplimiento promedio", current: goals.resumen.cumplimiento_promedio,   previous: goals.comparativo.resumen_anterior.cumplimiento_promedio,   delta: goals.comparativo.delta_cumplimiento },
                { label: "Metas cumplidas",        current: goals.resumen.metas_cumplidas,          previous: goals.comparativo.resumen_anterior.metas_cumplidas,          delta: goals.comparativo.delta_metas_cumplidas },
                { label: "Metas activas",          current: goals.resumen.metas_activas,            previous: goals.comparativo.resumen_anterior.metas_activas,            delta: compare(goals.resumen.metas_activas, goals.comparativo.resumen_anterior.metas_activas) },
              ]}
              value_formatter={(v) => `${pct.format(v)}${v <= 100 ? "%" : ""}`} />
            <ComparisonBars title="Avance monetario"
              items={[
                { label: "Monto alcanzado",  current: goals.resumen.total_actual,   previous: goals.comparativo.resumen_anterior.total_actual,   delta: goals.comparativo.delta_monto_actual },
                { label: "Objetivo total",   current: goals.resumen.total_objetivo,  previous: goals.comparativo.resumen_anterior.total_objetivo,  delta: compare(goals.resumen.total_objetivo, goals.comparativo.resumen_anterior.total_objetivo) },
                { label: "Brecha",           current: Math.max(0, goals.resumen.total_objetivo - goals.resumen.total_actual), previous: Math.max(0, goals.comparativo.resumen_anterior.total_objetivo - goals.comparativo.resumen_anterior.total_actual), delta: compare(Math.max(0, goals.resumen.total_objetivo - goals.resumen.total_actual), Math.max(0, goals.comparativo.resumen_anterior.total_objetivo - goals.comparativo.resumen_anterior.total_actual)) },
              ]}
              value_formatter={(v) => fmt.format(v)} />
          </section>

          <ComparisonBars title="Composición de metas"
            items={[
              { label: "Semanales", current: goals.resumen.metas_semanales, previous: 0, delta: null },
              { label: "Mensuales", current: goals.resumen.metas_mensuales, previous: 0, delta: null },
              { label: "Críticas",  current: goals.resumen.criticas,        previous: 0, delta: null },
            ]} />

          <GoalsPanel
            fecha_desde={filtros.fecha_desde}
            fecha_hasta={filtros.fecha_hasta}
            sucursales={catalogos.sucursales}
            operadores={catalogos.vendedores.filter((item) => item.rol !== "gerente")}
            resumen={goals.resumen}
            metas={goals.metas}
            ranking={goals.ranking}
          />
        </div>
      )}

      {/* ── INVENTARIO ── */}
      {current_tab === "inventario" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-3">
            <CompareCard title="Faltantes del periodo" current={String(resumen.faltantes_periodo).padStart(2,"0")}                           previous={String(resumen.faltantes_periodo_anterior).padStart(2,"0")}               delta={metrics.comparativos_modulos.inventario.delta}        note="Demandas insatisfechas entre periodos equivalentes." />
            <CompareCard title="Margen comercial"      current={fmt.format(metrics.comparativos_modulos.inventario.margen_actual)}            previous={fmt.format(metrics.comparativos_modulos.inventario.margen_anterior)}       delta={metrics.comparativos_modulos.inventario.margen_delta} note="Aporte comercial del mix vendido." />
            <CompareCard title="Riesgo actual"         current={String(metrics.productosEnRiesgo.length).padStart(2,"0")}                    previous="N/D"                                                                       delta={null}                                                 note="Foto operativa: productos bajo mínimo." />
          </section>

          <section className="grid gap-4 xl:grid-cols-4">
            <SummaryCard label="Productos en riesgo"   value={String(metrics.productosEnRiesgo.length).padStart(2,"0")}  note="Igual o por debajo del mínimo." />
            <SummaryCard label="Faltantes pendientes"  value={String(resumen.faltantes_pendientes).padStart(2,"0")}       note="Demandas sin resolver que ya pegan en venta." />
            <SummaryCard label="Asistencias hoy"       value={String(resumen.asistencias_hoy).padStart(2,"0")}            note="Cobertura operativa del día actual." />
            <SummaryCard label="Margen líder"          value={fmt.format(metrics.margen_por_producto[0]?.margen ?? 0)}    note={metrics.margen_por_producto[0]?.nombre ?? "Sin historial."} />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Riesgo operativo</p>
              <div className="mt-5 space-y-3">
                {metrics.productosEnRiesgo.length === 0 ? (
                  <div className="rounded-xl px-4 py-8 text-center text-sm" style={{ ...C, color: "#52525b" }}>
                    Sin productos comprometidos en este momento.
                  </div>
                ) : (
                  metrics.productosEnRiesgo.map((p) => (
                    <div key={`${p.id}-${p.sucursal}`} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={C}>
                      <div>
                        <p className="font-bold" style={{ color: "#fafaf9" }}>{p.nombre}</p>
                        <p className="text-xs" style={{ color: "#52525b" }}>{p.sucursal}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold" style={{ color: "#f87171" }}>Stock {p.stock}</p>
                        <p className="text-xs" style={{ color: "#52525b" }}>Mín. {p.minimo}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-2xl p-6" style={S}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Margen por sucursal</p>
              <div className="mt-5 space-y-3">
                {metrics.margen_por_sucursal.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={C}>
                    <div>
                      <p className="font-bold" style={{ color: "#fafaf9" }}>{s.nombre}</p>
                      <p className="text-xs" style={{ color: "#52525b" }}>Venta {fmt.format(s.total)}</p>
                    </div>
                    <p className="font-bold" style={{ color: "#34d399" }}>{fmt.format(s.margen)}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-2xl p-6" style={S}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3f3f46" }}>Margen por producto</p>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <tr>
                    {["Producto", "Unidades", "Margen"].map((h, i) => (
                      <th key={h} className={`${TH}${i > 0 ? " text-right" : ""}`} style={{ color: "#3f3f46" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.margen_por_producto.map((p) => (
                    <tr key={p.producto_id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className={TD} style={{ color: "#fafaf9" }}>{p.nombre}</td>
                      <td className={`${TD} text-right`} style={{ color: "#71717a" }}>{p.unidades}</td>
                      <td className={`${TD} text-right font-bold`} style={{ color: "#34d399" }}>{fmt.format(p.margen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <ComparisonBars title="Margen por sucursal"
              items={metrics.margen_por_sucursal.slice(0, 5).map((item) => {
                const branch = metrics.comparativa_sucursales.find((b) => b.id === item.id);
                return { label: item.nombre, current: item.total, previous: branch?.total_anterior ?? 0, delta: branch?.comparativo ?? null };
              })}
              value_formatter={(v) => fmt.format(v)} />
            <ComparisonBars title="Productos top por margen"
              items={metrics.margen_por_producto.slice(0, 5).map((item) => ({ label: item.nombre, current: item.margen, previous: 0, delta: null }))}
              value_formatter={(v) => fmt.format(v)} />
          </section>
        </div>
      )}
    </div>
  );
}
