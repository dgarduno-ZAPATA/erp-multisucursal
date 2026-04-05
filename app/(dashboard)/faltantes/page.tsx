import { getFaltantesBoard, getRankingFaltantes } from "@/actions/faltantes";
import { ResolveGroupButton } from "@/components/faltantes/resolve-group-button";

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const S  = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C  = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const TH = "pb-3 pr-4 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "py-3 pr-4 text-sm";

export default async function FaltantesPage() {
  const [board, ranking] = await Promise.all([getFaltantesBoard(), getRankingFaltantes()]);

  return (
    <div className="space-y-5">
      {/* Header KPIs */}
      <section className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg,#1a0606 0%,#111114 55%,#111114 100%)", border: "1px solid rgba(248,113,113,0.12)" }}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "rgba(248,113,113,0.6)" }}>
              Flujo de reposición
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Faltantes operativos</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: "#52525b" }}>
              Cola de reposición por producto y sucursal. Cierra grupos, no tickets sueltos.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Grupos activos",   value: board.resumen.grupos_pendientes, color: "#fafaf9" },
              { label: "Reportes hoy",     value: board.resumen.reportes_hoy,      color: "#f87171" },
              { label: "Pendientes",       value: board.resumen.pendientes,         color: "#f59e0b" },
              { label: "Venta en riesgo",  value: fmt.format(board.resumen.perdida_estimada), color: "#fca5a5" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl px-4 py-4" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3f3f46" }}>{k.label}</div>
                <div className="mt-2 text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        {/* Cola operativa */}
        <article className="rounded-2xl p-6" style={S}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Cola operativa</p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Lo que hay que reponer</h2>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
              {board.resumen.grupos_pendientes} grupo{board.resumen.grupos_pendientes === 1 ? "" : "s"} activos
            </span>
          </div>

          {board.cola_operativa.length === 0 ? (
            <div className="rounded-xl px-4 py-10 text-center text-sm font-semibold"
              style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.14)", color: "#34d399" }}>
              Todo al día. No hay grupos pendientes.
            </div>
          ) : (
            <div className="space-y-4">
              {board.cola_operativa.map((item, index) => (
                <article key={`${item.producto_id}-${item.sucursal_id}`} className="rounded-xl p-5"
                  style={C}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-bold" style={{ color: "#fafaf9" }}>{item.producto_nombre}</h3>
                          <p className="text-xs uppercase tracking-wide" style={{ color: "#52525b" }}>
                            {item.producto_sku} | {item.sucursal_nombre}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: "rgba(248,113,113,0.1)", color: "#f87171" }}>
                          {item.unidades} uds faltantes
                        </span>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: "rgba(255,255,255,0.05)", color: "#71717a" }}>
                          {item.reportes} reporte{item.reportes === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                          Riesgo {fmt.format(item.perdida_estimada)}
                        </span>
                        <span className="rounded-full px-2.5 py-0.5 text-xs"
                          style={{ background: "rgba(56,189,248,0.08)", color: "#38bdf8" }}>
                          Último {DATE_FORMAT.format(new Date(item.ultimo_reporte))}
                        </span>
                      </div>
                      {item.usuarios.length > 0 && (
                        <p className="mt-3 text-sm" style={{ color: "#52525b" }}>
                          Reportaron: <span style={{ color: "#a1a1aa" }}>{item.usuarios.join(", ")}</span>
                        </p>
                      )}
                      {item.motivos.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.motivos.slice(0, 3).map((m) => (
                            <span key={m} className="rounded-lg px-2.5 py-1 text-xs" style={C}>{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ResolveGroupButton producto_id={item.producto_id} sucursal_id={item.sucursal_id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        {/* Ranking panels */}
        <div className="space-y-5">
          {/* Productos más pedidos */}
          <article className="rounded-2xl p-6" style={S}>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Prioridad</p>
            <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Productos más pedidos</h2>
            {ranking.length === 0 ? (
              <div className="mt-5 rounded-xl py-8 text-center text-sm" style={{ ...C, color: "#52525b" }}>
                Sin demanda acumulada.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {ranking.slice(0, 6).map((item, index) => {
                  const max = ranking[0]?.unidades_faltantes || 1;
                  const pct = Math.round((item.unidades_faltantes / max) * 100);
                  return (
                    <div key={item.producto_id} className="rounded-xl p-4" style={C}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold" style={{ color: "#52525b" }}>#{index + 1}</div>
                          <div className="truncate font-semibold" style={{ color: "#fafaf9" }}>{item.nombre}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold" style={{ color: "#f87171" }}>{item.unidades_faltantes} uds</div>
                          <div className="text-xs" style={{ color: "#52525b" }}>{item.veces_reportado} rep.</div>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "#f87171" }} />
                      </div>
                      <div className="mt-1.5 text-right text-xs" style={{ color: "#52525b" }}>
                        Riesgo {fmt.format(item.perdida_estimada)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          {/* Top sucursales */}
          <article className="rounded-2xl p-6" style={S}>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Dónde pega más</p>
            <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Sucursales con más presión</h2>
            {board.top_sucursales.length === 0 ? (
              <div className="mt-5 rounded-xl py-8 text-center text-sm" style={{ ...C, color: "#52525b" }}>
                Sin presión operativa registrada.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {board.top_sucursales.map((item) => (
                  <div key={item.sucursal_id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={C}>
                    <div>
                      <div className="font-semibold" style={{ color: "#fafaf9" }}>{item.sucursal_nombre}</div>
                      <div className="text-xs" style={{ color: "#52525b" }}>{item.reportes} reporte(s)</div>
                    </div>
                    <div className="font-bold" style={{ color: "#f59e0b" }}>{item.unidades} uds</div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      {/* Historial resueltos */}
      {board.historial_atendido.length > 0 && (
        <section className="rounded-2xl p-6" style={S}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Historial</p>
              <h2 className="mt-1.5 text-lg font-bold" style={{ color: "#fafaf9" }}>Últimos faltantes resueltos</h2>
            </div>
            <span className="text-sm" style={{ color: "#52525b" }}>
              {board.resumen.atendidos} atendido{board.resumen.atendidos === 1 ? "" : "s"} acumulado{board.resumen.atendidos === 1 ? "" : "s"}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <tr>
                  {["Producto", "Sucursal", "Cant.", "Reportó", "Fecha"].map((h) => (
                    <th key={h} className={TH} style={{ color: "#3f3f46" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.historial_atendido.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className={TD}>
                      <div className="font-semibold" style={{ color: "#fafaf9" }}>{item.producto_nombre}</div>
                      <div className="text-xs" style={{ color: "#52525b" }}>{item.producto_sku}</div>
                    </td>
                    <td className={TD} style={{ color: "#71717a" }}>{item.sucursal_nombre}</td>
                    <td className={`${TD} text-center font-bold`} style={{ color: "#a1a1aa" }}>{item.cantidad_faltante}</td>
                    <td className={TD} style={{ color: "#71717a" }}>{item.usuario_nombre ?? "—"}</td>
                    <td className={TD} style={{ color: "#52525b" }}>{DATE_FORMAT.format(new Date(item.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
