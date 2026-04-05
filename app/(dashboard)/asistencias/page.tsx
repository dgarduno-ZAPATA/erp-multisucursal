import { getAttendanceReport } from "@/actions/asistencias";
import { require_roles } from "@/lib/auth/rbac";

type AttendancePageProps = {
  searchParams?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    sucursal_id?: string;
    vendedor_id?: string;
  };
};

const time_fmt = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" });

const S  = { border: "1px solid rgba(255,255,255,0.06)", background: "#111114" };
const C  = { border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.025)" };
const TH = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.18em]";
const TD = "px-4 py-3 text-sm";

const INPUT_STYLE = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#a1a1aa",
  colorScheme: "dark" as const,
};

export default async function AsistenciasPage({ searchParams }: AttendancePageProps) {
  await require_roles(["admin", "gerente"]);

  const sucursal_id = searchParams?.sucursal_id ? Number(searchParams.sucursal_id) : undefined;
  const report = await getAttendanceReport({
    fecha_desde: searchParams?.fecha_desde,
    fecha_hasta: searchParams?.fecha_hasta,
    sucursal_id: Number.isInteger(sucursal_id) ? sucursal_id : undefined,
    vendedor_id: searchParams?.vendedor_id || undefined,
  });

  return (
    <div className="space-y-5">
      {/* Header + Filters */}
      <section className="rounded-2xl p-6" style={S}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em]" style={{ color: "#3f3f46" }}>Operación humana</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "#fafaf9" }}>Asistencias</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: "#52525b" }}>
              Control diario de horas, retardos y presencia. Retardo calculado desde{" "}
              <span style={{ color: "#a1a1aa" }}>{report.reglas.hora_esperada}</span> con tolerancia de{" "}
              <span style={{ color: "#a1a1aa" }}>{report.reglas.tolerancia_minutos}</span> min.
            </p>
          </div>
          <form className="flex flex-wrap gap-2">
            <input type="date" name="fecha_desde" defaultValue={report.filtros.fecha_desde}
              className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
            <input type="date" name="fecha_hasta" defaultValue={report.filtros.fecha_hasta}
              className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE} />
            <select name="sucursal_id" defaultValue={report.filtros.sucursal_id ? String(report.filtros.sucursal_id) : ""}
              className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
              <option value="">Todas las sucursales</option>
              {report.catalogos.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select name="vendedor_id" defaultValue={report.filtros.vendedor_id ?? ""}
              className="rounded-xl px-3 py-2.5 text-sm outline-none" style={INPUT_STYLE}>
              <option value="">Todos los operadores</option>
              {report.catalogos.operadores.map((o) => <option key={o.id} value={o.id}>{o.nombre} · {o.rol}</option>)}
            </select>
            <button type="submit" className="rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "#f59e0b", color: "#0c0c0e" }}>
              Filtrar
            </button>
          </form>
        </div>
      </section>

      {/* Resumen por operador */}
      {report.resumen.length > 0 && (
        <section className="grid gap-4 xl:grid-cols-3">
          {report.resumen.map((item) => (
            <article key={item.usuario_id} className="rounded-2xl p-5" style={C}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold" style={{ color: "#fafaf9" }}>{item.nombre}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-[0.14em]" style={{ color: "#52525b" }}>
                    {item.rol} · {item.sucursal}
                  </p>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }}>
                  {item.asistencias} días
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.12)" }}>
                  <div className="text-xs" style={{ color: "#52525b" }}>Horas</div>
                  <div className="mt-1 text-xl font-bold" style={{ color: "#22d3ee" }}>{item.horas.toFixed(1)}</div>
                </div>
                <div className="rounded-xl p-3"
                  style={item.retardos > 0
                    ? { background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.12)" }
                    : { background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.12)" }}>
                  <div className="text-xs" style={{ color: "#52525b" }}>Retardos</div>
                  <div className="mt-1 text-xl font-bold" style={{ color: item.retardos > 0 ? "#f87171" : "#34d399" }}>
                    {item.retardos}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Detalle diario */}
      <section className="rounded-2xl p-6" style={S}>
        <h2 className="text-lg font-bold mb-5" style={{ color: "#fafaf9" }}>Detalle diario</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <tr>
                {["Fecha", "Operador", "Sucursal", "Entrada", "Salida", "Horas", "Retardo", "Estado"].map((h, i) => (
                  <th key={h} className={`${TH}${i >= 5 ? " text-right" : ""}`} style={{ color: "#3f3f46" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: "#52525b" }}>
                    Sin asistencias para el filtro actual.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className={TD} style={{ color: "#a1a1aa" }}>{row.fecha_operativa}</td>
                    <td className={TD}>
                      <div className="font-semibold" style={{ color: "#fafaf9" }}>{row.usuario_nombre}</div>
                      <div className="text-xs uppercase tracking-wide" style={{ color: "#3f3f46" }}>{row.usuario_rol}</div>
                    </td>
                    <td className={TD} style={{ color: "#71717a" }}>{row.sucursal_nombre}</td>
                    <td className={TD} style={{ color: "#a1a1aa" }}>{time_fmt.format(new Date(row.hora_entrada))}</td>
                    <td className={TD} style={{ color: "#a1a1aa" }}>
                      {row.hora_salida ? time_fmt.format(new Date(row.hora_salida)) : <span style={{ color: "#f59e0b" }}>Abierto</span>}
                    </td>
                    <td className={`${TD} text-right font-bold`} style={{ color: "#22d3ee" }}>{row.horas_trabajadas.toFixed(2)}</td>
                    <td className={`${TD} text-right font-bold`} style={{ color: row.llego_tarde ? "#f87171" : "#34d399" }}>
                      {row.minutos_retardo} min
                    </td>
                    <td className={TD}>
                      <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold"
                        style={row.estado === "cerrada"
                          ? { background: "rgba(52,211,153,0.1)",  color: "#34d399" }
                          : { background: "rgba(245,158,11,0.1)",  color: "#f59e0b" }}>
                        {row.estado}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
