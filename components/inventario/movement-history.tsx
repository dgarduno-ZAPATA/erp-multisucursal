type MovimientoRow = {
  id: number;
  tipo: string;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  referencia: string | null;
  created_at: string;
  producto_nombre: string;
  producto_sku: string;
  sucursal_nombre: string;
  usuario_nombre: string | null;
};

type MovementHistoryProps = {
  movimientos: MovimientoRow[];
  producto_filtrado?: {
    id: number;
    nombre: string;
    sku: string;
  } | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function tipo_badge(tipo: string) {
  if (tipo === "entrada") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }
  if (tipo === "salida") {
    return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  }
  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

export function MovementHistory({ movimientos, producto_filtrado }: MovementHistoryProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
            Trazabilidad
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            {producto_filtrado ? "Kardex del producto" : "Historial reciente de movimientos"}
          </h2>
          {producto_filtrado ? (
            <p className="mt-2 text-sm text-slate-400">
              {producto_filtrado.nombre} · {producto_filtrado.sku}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
          {movimientos.length} registros
        </span>
      </div>

      {movimientos.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
          Aun no hay movimientos de inventario registrados.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Sucursal</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold text-center">Cant.</th>
                <th className="px-4 py-3 font-semibold text-center">Stock</th>
                <th className="px-4 py-3 font-semibold">Motivo</th>
                <th className="px-4 py-3 font-semibold">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((movimiento) => (
                <tr key={movimiento.id} className="border-b border-white/5 align-top text-slate-200">
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {DATE_FORMAT.format(new Date(movimiento.created_at))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{movimiento.producto_nombre}</div>
                    <div className="text-xs text-slate-500">{movimiento.producto_sku}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{movimiento.sucursal_nombre}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tipo_badge(movimiento.tipo)}`}>
                      {movimiento.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-white">
                    {movimiento.cantidad}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-400 whitespace-nowrap">
                    {movimiento.stock_anterior} → {movimiento.stock_nuevo}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    <div>{movimiento.motivo ?? "Sin motivo"}</div>
                    {movimiento.referencia ? (
                      <div className="mt-1 text-xs text-slate-500">{movimiento.referencia}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {movimiento.usuario_nombre ?? "Sistema"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
