import { getDashboardMetrics } from "@/actions/dashboard";
import { getSalesGoalsSummary } from "@/actions/metas";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { GoalsPanel } from "@/components/dashboard/goals-panel";
import { require_roles } from "@/lib/auth/rbac";

type DashboardPageProps = {
  searchParams?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    sucursal_id?: string;
    vendedor_id?: string;
  };
};

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

// ─── shared card style ────────────────────────────────────────────────────────
const CARD = "rounded-2xl p-5";
const CARD_BORDER = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const SECTION = "rounded-[24px] p-6";
const SECTION_BORDER = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-1.5 text-lg font-bold tracking-tight" style={{ color: "#fafaf9" }}>
      {children}
    </h2>
  );
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
      style={{
        background: up ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
        color: up ? "#34d399" : "#f87171",
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

// dark table styles
const TH = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "px-4 py-3 text-sm";

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
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

  const { filtros, catalogos, resumen } = metrics;

  const kpi_cards = [
    {
      label: "Ventas del periodo",
      value: fmt.format(resumen.total_periodo),
      note: `${resumen.transacciones_periodo} transacción${resumen.transacciones_periodo === 1 ? "" : "es"}`,
      accent: "#34d399",
    },
    {
      label: "Ventas hoy",
      value: fmt.format(resumen.ventas_hoy),
      note: `${resumen.transacciones_hoy} ticket${resumen.transacciones_hoy === 1 ? "" : "s"}`,
      accent: "#38bdf8",
    },
    {
      label: "Ticket promedio",
      value: fmt.format(resumen.ticket_promedio),
      note: "Promedio del filtro actual",
      accent: "#a78bfa",
    },
    {
      label: "Margen estimado",
      value: fmt.format(resumen.margen_estimado),
      note: "Ventas menos costo estimado",
      accent: resumen.margen_estimado >= 0 ? "#f59e0b" : "#f87171",
    },
    {
      label: "Cancelaciones",
      value: String(resumen.cancelaciones_count).padStart(2, "0"),
      note: fmt.format(resumen.total_cancelado),
      accent: resumen.cancelaciones_count > 0 ? "#f87171" : "#34d399",
    },
    {
      label: "Asistencias hoy",
      value: String(resumen.asistencias_hoy).padStart(2, "0"),
      note: `${resumen.faltantes_pendientes} faltante${resumen.faltantes_pendientes === 1 ? "" : "s"} pendiente${resumen.faltantes_pendientes === 1 ? "" : "s"}`,
      accent: "#22d3ee",
    },
  ];

  return (
    <div className="space-y-5">

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <section className={SECTION} style={SECTION_BORDER}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Label>Analítica comercial</Label>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>
              Dashboard gerencial
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: "#52525b" }}>
              Seguimiento económico por periodo, sucursal y operador con comparativos y margen.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form className="flex flex-wrap gap-2">
              {/* Date inputs */}
              {[
                { name: "fecha_desde", value: filtros.fecha_desde, type: "date" },
                { name: "fecha_hasta", value: filtros.fecha_hasta, type: "date" },
              ].map((f) => (
                <input
                  key={f.name}
                  type={f.type}
                  name={f.name}
                  defaultValue={f.value}
                  className="rounded-xl px-3 py-2 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#a1a1aa",
                    colorScheme: "dark",
                  }}
                />
              ))}

              <select
                name="sucursal_id"
                defaultValue={filtros.sucursal_id ? String(filtros.sucursal_id) : ""}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#a1a1aa",
                  colorScheme: "dark",
                }}
              >
                <option value="">Todas las sucursales</option>
                {catalogos.sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>

              <select
                name="vendedor_id"
                defaultValue={filtros.vendedor_id ?? ""}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#a1a1aa",
                  colorScheme: "dark",
                }}
              >
                <option value="">Todos los operadores</option>
                {catalogos.vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nombre} · {v.rol}</option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                style={{ background: "#f59e0b", color: "#0c0c0e" }}
              >
                Filtrar
              </button>
            </form>

            <div className="flex gap-2">
              <a
                href={`/api/v1/dashboard/export?fecha_desde=${encodeURIComponent(filtros.fecha_desde)}&fecha_hasta=${encodeURIComponent(filtros.fecha_hasta)}&sucursal_id=${encodeURIComponent(filtros.sucursal_id ? String(filtros.sucursal_id) : "")}&vendedor_id=${encodeURIComponent(filtros.vendedor_id ?? "")}`}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#71717a",
                }}
              >
                Excel
              </a>
              <a
                href={`/dashboard/pdf?fecha_desde=${encodeURIComponent(filtros.fecha_desde)}&fecha_hasta=${encodeURIComponent(filtros.fecha_hasta)}&sucursal_id=${encodeURIComponent(filtros.sucursal_id ? String(filtros.sucursal_id) : "")}&vendedor_id=${encodeURIComponent(filtros.vendedor_id ?? "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#71717a",
                }}
              >
                PDF
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpi_cards.map((card) => (
          <article key={card.label} className={CARD} style={CARD_BORDER}>
            <p className="text-xs font-medium" style={{ color: "#52525b" }}>{card.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-tight" style={{ color: card.accent }}>
              {card.value}
            </p>
            <p className="mt-1 text-xs" style={{ color: "#3f3f46" }}>{card.note}</p>
          </article>
        ))}
      </section>

      {/* ── PULSO + LECTURA RÁPIDA ─────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Pulso del negocio — accent section */}
        <article
          className={`${SECTION} text-white`}
          style={{
            background: "linear-gradient(135deg,#1a1200 0%,#111114 55%,#0f1a0d 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <Label>Dirección</Label>
          <SectionTitle>Pulso del negocio</SectionTitle>
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "#71717a" }}>
            El periodo acumula{" "}
            <span style={{ color: "#f59e0b" }}>{fmt.format(resumen.total_periodo)}</span> en ventas
            y <span style={{ color: "#34d399" }}>{fmt.format(resumen.margen_estimado)}</span> de margen estimado.
            Sede líder: <span style={{ color: "#fafaf9" }}>{resumen.sucursal_top?.nombre ?? "sin datos"}</span>.
            Operador top: <span style={{ color: "#fafaf9" }}>{resumen.vendedor_top?.nombre ?? "sin datos"}</span>.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { label: "Semana", value: fmt.format(resumen.ventas_semana), note: `${resumen.transacciones_semana} tickets`, color: "#38bdf8" },
              { label: "Mes",    value: fmt.format(resumen.ventas_mes),    note: `${resumen.transacciones_mes} tickets`,    color: "#34d399" },
              { label: "Utilidad estimada", value: fmt.format(resumen.margen_estimado), note: "Antes de gasto fijo", color: "#f59e0b" },
            ].map((m) => (
              <div key={m.label} className={CARD} style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{m.label}</div>
                <div className="mt-2 text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
                <div className="mt-1 text-xs" style={{ color: "#52525b" }}>{m.note}</div>
              </div>
            ))}
          </div>
        </article>

        {/* Lectura rápida */}
        <aside className={SECTION} style={SECTION_BORDER}>
          <Label>Focos ejecutivos</Label>
          <SectionTitle>Lectura rápida</SectionTitle>
          <div className="mt-4 space-y-3">
            {[
              { label: "Crecimiento semanal", value: fmt.format(resumen.ventas_semana), pct: resumen.comparativo_semana },
              { label: "Crecimiento mensual", value: fmt.format(resumen.ventas_mes),    pct: resumen.comparativo_mes },
            ].map((row) => (
              <div key={row.label} className={CARD} style={CARD_BORDER}>
                <div className="text-xs" style={{ color: "#52525b" }}>{row.label}</div>
                <div className="mt-2 flex items-center gap-2">
                  <TrendBadge pct={row.pct} />
                  <span className="text-xl font-bold" style={{ color: "#fafaf9" }}>{row.value}</span>
                </div>
              </div>
            ))}
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Riesgo — cancelaciones</div>
              <div className="mt-2 text-xl font-bold" style={{ color: "#f87171" }}>
                {resumen.cancelaciones_count} cancelaciones
              </div>
              <div className="mt-1 text-xs" style={{ color: "#3f3f46" }}>
                {fmt.format(resumen.total_cancelado)} comprometidos
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* ── PROYECCIÓN ─────────────────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Cierre estimado */}
        <article
          className={SECTION}
          style={{
            background: "linear-gradient(135deg,#051a12 0%,#111114 55%,#011008 100%)",
            border: "1px solid rgba(52,211,153,0.1)",
          }}
        >
          <Label>Proyección</Label>
          <SectionTitle>Cierre estimado del mes</SectionTitle>
          <p className="mt-2 text-sm leading-6" style={{ color: "#71717a" }}>
            Al ritmo de{" "}
            <span style={{ color: "#34d399" }}>{fmt.format(resumen.run_rate_diario)}</span>/día,
            el mes podría cerrar en{" "}
            <span style={{ color: "#fafaf9" }}>{fmt.format(resumen.proyeccion_cierre_mes)}</span>.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { label: "Run rate diario",  value: fmt.format(resumen.run_rate_diario),           color: "#fafaf9" },
              { label: "Proyección mes",   value: fmt.format(resumen.proyeccion_cierre_mes),     color: "#34d399" },
              { label: "Días corridos",    value: `${resumen.dias_transcurridos_mes}/${resumen.dias_totales_mes}`, color: "#fafaf9" },
            ].map((m) => (
              <div key={m.label} className={CARD} style={{ border: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.3)" }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{m.label}</div>
                <div className="mt-2 text-2xl font-bold" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        </article>

        {/* Desvío y alerta */}
        <aside className={SECTION} style={SECTION_BORDER}>
          <Label>Lectura de dirección</Label>
          <SectionTitle>Desvío y alerta</SectionTitle>
          <div className="mt-4 space-y-3">
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Proyección vs mes anterior</div>
              <div className="mt-2 flex items-center gap-2">
                <TrendBadge pct={resumen.comparativo_proyeccion_mes} />
                <span className="text-xl font-bold" style={{ color: "#fafaf9" }}>
                  {fmt.format(resumen.proyeccion_cierre_mes)}
                </span>
              </div>
            </div>
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Brecha del ritmo mensual</div>
              <div className="mt-2 text-xl font-bold" style={{ color: resumen.brecha_ritmo_mes >= 0 ? "#34d399" : "#f87171" }}>
                {fmt.format(resumen.brecha_ritmo_mes)}
              </div>
            </div>
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Alerta ejecutiva</div>
              <div className="mt-2">
                <span
                  className="inline-flex rounded-full px-3 py-1 text-sm font-bold"
                  style={{
                    background:
                      resumen.alerta_proyeccion === "saludable" ? "rgba(52,211,153,0.12)"
                      : resumen.alerta_proyeccion === "vigilancia" ? "rgba(245,158,11,0.12)"
                      : resumen.alerta_proyeccion === "critica" ? "rgba(248,113,113,0.12)"
                      : "rgba(255,255,255,0.06)",
                    color:
                      resumen.alerta_proyeccion === "saludable" ? "#34d399"
                      : resumen.alerta_proyeccion === "vigilancia" ? "#f59e0b"
                      : resumen.alerta_proyeccion === "critica" ? "#f87171"
                      : "#71717a",
                  }}
                >
                  {resumen.alerta_proyeccion === "saludable" ? "Saludable"
                    : resumen.alerta_proyeccion === "vigilancia" ? "Vigilancia"
                    : resumen.alerta_proyeccion === "critica" ? "Crítica"
                    : "Sin datos"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* ── CHART + COMPARATIVOS ───────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <article className={SECTION} style={SECTION_BORDER}>
          <Label>Últimos 7 días</Label>
          <SectionTitle>Ingresos por día</SectionTitle>
          <SalesChart data={metrics.ventas_por_dia} />
        </article>

        <aside className={SECTION} style={SECTION_BORDER}>
          <Label>Semana vs mes</Label>
          <SectionTitle>Comparativos económicos</SectionTitle>
          <div className="mt-5 space-y-3">
            {[
              { label: "Semana actual", value: fmt.format(resumen.ventas_semana), note: `${resumen.transacciones_semana} ticket${resumen.transacciones_semana === 1 ? "" : "s"}`, pct: resumen.comparativo_semana },
              { label: "Mes actual",    value: fmt.format(resumen.ventas_mes),    note: `${resumen.transacciones_mes} ticket${resumen.transacciones_mes === 1 ? "" : "s"}`,    pct: resumen.comparativo_mes },
            ].map((row) => (
              <div key={row.label} className={CARD} style={CARD_BORDER}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: "#52525b" }}>{row.label}</span>
                  <TrendBadge pct={row.pct} />
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: "#fafaf9" }}>{row.value}</div>
                <div className="mt-1 text-xs" style={{ color: "#3f3f46" }}>{row.note}</div>
              </div>
            ))}
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Sucursal líder</div>
              <div className="mt-2 font-bold" style={{ color: "#fafaf9" }}>{resumen.sucursal_top?.nombre ?? "Sin ventas"}</div>
              <div className="mt-0.5 text-sm font-semibold" style={{ color: "#34d399" }}>
                {fmt.format(resumen.sucursal_top?.total ?? 0)}
              </div>
            </div>
            <div className={CARD} style={CARD_BORDER}>
              <div className="text-xs" style={{ color: "#52525b" }}>Operador líder</div>
              <div className="mt-2 font-bold" style={{ color: "#fafaf9" }}>{resumen.vendedor_top?.nombre ?? "Sin ventas"}</div>
              <div className="mt-0.5 text-sm font-semibold" style={{ color: "#38bdf8" }}>
                {fmt.format(resumen.vendedor_top?.total ?? 0)}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* ── METAS ─────────────────────────────────────────────────────────── */}
      <GoalsPanel
        fecha_desde={goals.filtros.fecha_desde}
        fecha_hasta={goals.filtros.fecha_hasta}
        sucursales={goals.catalogos.sucursales}
        operadores={goals.catalogos.operadores}
        resumen={goals.resumen}
        metas={goals.metas}
        ranking={goals.ranking}
      />

      {/* ── MARGEN SUCURSAL + MARGEN PRODUCTO ─────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2">
        {/* Margen por sucursal */}
        <article className={SECTION} style={SECTION_BORDER}>
          <Label>Rentabilidad</Label>
          <SectionTitle>Margen por sucursal</SectionTitle>
          <div className="mt-5 space-y-4">
            {metrics.margen_por_sucursal.map((s) => {
              const pct = resumen.total_periodo > 0
                ? Math.min(100, Math.round((s.total / resumen.total_periodo) * 100))
                : 0;
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold" style={{ color: "#fafaf9" }}>{s.nombre}</span>
                    <div className="text-right">
                      <span className="font-bold" style={{ color: "#f59e0b" }}>{fmt.format(s.margen)}</span>
                      <span className="ml-2 text-xs" style={{ color: "#3f3f46" }}>venta {fmt.format(s.total)}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "#f59e0b" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Margen por producto */}
        <article className={SECTION} style={SECTION_BORDER}>
          <Label>Rentabilidad</Label>
          <SectionTitle>Margen por producto</SectionTitle>
          <div className="mt-5 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <table className="min-w-full text-left text-sm">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <tr>
                  <th className={TH} style={{ color: "#3f3f46" }}>Producto</th>
                  <th className={`${TH} text-right`} style={{ color: "#3f3f46" }}>Unidades</th>
                  <th className={`${TH} text-right`} style={{ color: "#3f3f46" }}>Margen</th>
                </tr>
              </thead>
              <tbody>
                {metrics.margen_por_producto.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: "#3f3f46" }}>
                      Sin datos en el periodo.
                    </td>
                  </tr>
                ) : (
                  metrics.margen_por_producto.map((p) => (
                    <tr key={p.producto_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className={TD} style={{ color: "#a1a1aa" }}>{p.nombre}</td>
                      <td className={`${TD} text-right font-semibold`} style={{ color: "#38bdf8" }}>{p.unidades}</td>
                      <td className={`${TD} text-right font-bold`} style={{ color: "#f59e0b" }}>{fmt.format(p.margen)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {/* ── RENDIMIENTO OPERADORES + ALERTAS ──────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        {/* Rendimiento por operador */}
        <article className={SECTION} style={SECTION_BORDER}>
          <Label>Productividad comercial</Label>
          <SectionTitle>Rendimiento por operador</SectionTitle>
          <div className="mt-5 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <table className="min-w-full text-left text-sm">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <tr>
                  {["Operador", "Sucursal", "Tickets", "Ticket prom.", "Margen", "Venta total"].map((h, i) => (
                    <th key={h} className={`${TH}${i > 1 ? " text-right" : ""}`} style={{ color: "#3f3f46" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.rendimiento_vendedores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#3f3f46" }}>
                      Sin ventas en este rango.
                    </td>
                  </tr>
                ) : (
                  metrics.rendimiento_vendedores.map((v) => (
                    <tr key={v.usuario_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className={TD}>
                        <div className="font-semibold" style={{ color: "#fafaf9" }}>{v.nombre}</div>
                        <div className="text-xs uppercase tracking-wide" style={{ color: "#3f3f46" }}>{v.rol}</div>
                      </td>
                      <td className={TD} style={{ color: "#71717a" }}>{v.sucursal}</td>
                      <td className={`${TD} text-right font-semibold`} style={{ color: "#38bdf8" }}>{v.tickets}</td>
                      <td className={`${TD} text-right font-semibold`} style={{ color: "#a78bfa" }}>{fmt.format(v.ticket_promedio)}</td>
                      <td className={`${TD} text-right font-bold`} style={{ color: "#f59e0b" }}>{fmt.format(v.margen_estimado)}</td>
                      <td className={`${TD} text-right font-bold`} style={{ color: "#34d399" }}>{fmt.format(v.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Alertas de inventario */}
        <aside className={SECTION} style={SECTION_BORDER}>
          <Label>Riesgo operativo</Label>
          <SectionTitle>Alertas de inventario</SectionTitle>
          <div className="mt-5 space-y-3 text-sm">
            {metrics.productosEnRiesgo.length === 0 ? (
              <div
                className="rounded-xl p-4 text-sm font-semibold"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.14)", color: "#34d399" }}
              >
                Sin alertas activas.
              </div>
            ) : (
              metrics.productosEnRiesgo.map((p) => (
                <div
                  key={`${p.id}-${p.sucursal}`}
                  className="rounded-xl p-4"
                  style={
                    p.stock <= 0
                      ? { background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)" }
                      : { background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }
                  }
                >
                  <div className="font-semibold" style={{ color: "#fafaf9" }}>{p.nombre}</div>
                  <div className="mt-0.5 text-xs" style={{ color: "#52525b" }}>{p.sucursal}</div>
                  <div className="mt-2 font-bold text-sm" style={{ color: p.stock <= 0 ? "#f87171" : "#f59e0b" }}>
                    Stock: {p.stock} / Mín: {p.minimo}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      {/* ── COMPARATIVAS SUCURSALES + OPERADORES ──────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-2">
        {[
          {
            title: "Sucursales vs periodo anterior",
            rows: metrics.comparativa_sucursales.map((s) => ({
              key: String(s.id),
              name: s.nombre,
              sub: null as string | null,
              actual: s.total,
              anterior: s.total_anterior,
              pct: s.comparativo,
            })),
            cols: ["Sucursal", "Actual", "Anterior", "Delta"],
          },
          {
            title: "Operadores vs periodo anterior",
            rows: metrics.rendimiento_vendedores.map((v) => ({
              key: v.usuario_id,
              name: v.nombre,
              sub: v.sucursal,
              actual: v.total,
              anterior: v.total_anterior,
              pct: v.comparativo,
            })),
            cols: ["Operador", "Actual", "Anterior", "Delta"],
          },
        ].map((table) => (
          <article key={table.title} className={SECTION} style={SECTION_BORDER}>
            <Label>Comparativo</Label>
            <SectionTitle>{table.title}</SectionTitle>
            <div className="mt-5 overflow-hidden rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <table className="min-w-full text-left text-sm">
                <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <tr>
                    {table.cols.map((h, i) => (
                      <th key={h} className={`${TH}${i > 0 ? " text-right" : ""}`} style={{ color: "#3f3f46" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "#3f3f46" }}>
                        Sin datos comparativos.
                      </td>
                    </tr>
                  ) : (
                    table.rows.map((row) => (
                      <tr key={row.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td className={TD}>
                          <div className="font-semibold" style={{ color: "#fafaf9" }}>{row.name}</div>
                          {row.sub && <div className="text-xs" style={{ color: "#52525b" }}>{row.sub}</div>}
                        </td>
                        <td className={`${TD} text-right font-bold`} style={{ color: "#34d399" }}>{fmt.format(row.actual)}</td>
                        <td className={`${TD} text-right`} style={{ color: "#52525b" }}>{fmt.format(row.anterior)}</td>
                        <td className={`${TD} text-right`}><TrendBadge pct={row.pct} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </section>

      {/* ── CAJA ──────────────────────────────────────────────────────────── */}
      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {/* Resumen caja */}
        <aside className={SECTION} style={SECTION_BORDER}>
          <Label>Cierre de caja</Label>
          <SectionTitle>Control gerencial</SectionTitle>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Cierres",         value: metrics.resumen_caja.cierres_count,         color: "#fafaf9" },
              { label: "Cajas abiertas",  value: metrics.resumen_caja.cajas_abiertas,         color: "#f59e0b" },
              { label: "Con diferencia",  value: metrics.resumen_caja.cierres_con_diferencia, color: "#f87171" },
              { label: "Desviación total", value: fmt.format(metrics.resumen_caja.diferencias_abs), color: "#38bdf8" },
            ].map((kpi) => (
              <div key={kpi.label} className={CARD} style={CARD_BORDER}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{kpi.label}</div>
                <div className="mt-2 text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </aside>

        {/* Historial cierres */}
        <article className={SECTION} style={SECTION_BORDER}>
          <Label>Auditoría operativa</Label>
          <SectionTitle>Historial de cierres de caja</SectionTitle>
          <div className="mt-5 space-y-3">
            {metrics.cierres_caja.length === 0 ? (
              <div className={CARD} style={{ ...CARD_BORDER, textAlign: "center" }}>
                <span style={{ color: "#3f3f46", fontSize: "0.875rem" }}>Sin cierres en este rango.</span>
              </div>
            ) : (
              metrics.cierres_caja.map((cierre) => (
                <div key={cierre.id} className={CARD} style={CARD_BORDER}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="font-bold" style={{ color: "#fafaf9" }}>{cierre.sucursal_nombre}</div>
                      <div className="mt-0.5 text-sm" style={{ color: "#71717a" }}>
                        {cierre.operador_nombre} · {cierre.operador_rol}
                      </div>
                      <div className="mt-0.5 text-xs" style={{ color: "#3f3f46" }}>
                        {cierre.fecha_operativa} |{" "}
                        {new Date(cierre.hora_apertura).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                        {cierre.hora_cierre
                          ? ` - ${new Date(cierre.hora_cierre).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
                          : " | abierta"}
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      {[
                        { label: "Esperado",  value: fmt.format(cierre.monto_esperado ?? cierre.monto_inicial), color: "#a1a1aa" },
                        { label: "Declarado", value: fmt.format(cierre.monto_final_declarado ?? 0),                   color: "#fafaf9" },
                        {
                          label: "Diferencia",
                          value: fmt.format((cierre.monto_final_declarado ?? 0) - (cierre.monto_esperado ?? cierre.monto_inicial)),
                          color: ((cierre.monto_final_declarado ?? 0) - (cierre.monto_esperado ?? cierre.monto_inicial)) >= 0 ? "#34d399" : "#f87171",
                        },
                      ].map((cell) => (
                        <div key={cell.label} className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div className="text-[10px]" style={{ color: "#3f3f46" }}>{cell.label}</div>
                          <div className="mt-0.5 font-bold text-sm" style={{ color: cell.color }}>{cell.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

    </div>
  );
}
