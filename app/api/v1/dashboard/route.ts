import { prisma } from "@/lib/db/prisma";
import { api_ok, require_auth } from "@/lib/api/helpers";

function start_of_day(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function start_of_week(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function days_ago(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const { error } = await require_auth();
  if (error) return error;

  const now = new Date();
  const hoy_inicio = start_of_day(now);
  const semana_inicio = start_of_week(now);
  const semana_pasada_inicio = start_of_week(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const hace_7_dias = days_ago(6);

  const [
    kpi_hoy,
    kpi_semana,
    kpi_semana_anterior,
    kpi_total,
    total_productos,
    clientes_activos,
    ventas_7dias_raw,
    top_productos_raw,
    sucursales_raw,
    inventario_riesgo_raw,
    faltantes_pendientes,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha_venta: { gte: hoy_inicio }, estado: "completada" },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { fecha_venta: { gte: semana_inicio }, estado: "completada" },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { fecha_venta: { gte: semana_pasada_inicio, lt: semana_inicio }, estado: "completada" },
      _sum: { total: true },
    }),
    prisma.venta.aggregate({
      where: { estado: "completada" },
      _avg: { total: true },
      _count: { id: true },
    }),
    prisma.producto.count({ where: { activo: true } }),
    prisma.cliente.count({ where: { activo: true } }),
    prisma.venta.findMany({
      where: { fecha_venta: { gte: hace_7_dias }, estado: "completada" },
      select: { fecha_venta: true, total: true },
      orderBy: { fecha_venta: "asc" },
    }),
    prisma.detalleVenta.groupBy({
      by: ["producto_id"],
      where: { venta: { estado: "completada" } },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 10,
    }),
    prisma.sucursal.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        ventas: { where: { estado: "completada" }, select: { total: true } },
      },
    }),
    prisma.inventario.findMany({
      select: {
        stock_actual: true,
        stock_minimo: true,
        producto: { select: { id: true, nombre: true } },
        sucursal: { select: { nombre: true } },
      },
      orderBy: { stock_actual: "asc" },
      take: 50,
    }),
    prisma.faltante.count({ where: { estado: "pendiente" } }),
  ]);

  const day_labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const ventas_por_dia = Array.from({ length: 7 }, (_, i) => {
    const d = days_ago(6 - i);
    const fecha_str = d.toISOString().slice(0, 10);
    const total = ventas_7dias_raw
      .filter((v) => v.fecha_venta.toISOString().slice(0, 10) === fecha_str)
      .reduce((s, v) => s + Number(v.total), 0);
    return { label: day_labels[d.getDay()], fecha: fecha_str, total };
  });

  const producto_ids = top_productos_raw.map((r) => r.producto_id);
  const productos_map = await prisma.producto.findMany({
    where: { id: { in: producto_ids } },
    select: { id: true, nombre: true },
  });

  const top_productos = top_productos_raw.map((r) => {
    const p = productos_map.find((x) => x.id === r.producto_id);
    return {
      producto_id: r.producto_id,
      nombre: p?.nombre ?? `Producto #${r.producto_id}`,
      unidades: r._sum.cantidad ?? 0,
      monto: Number(r._sum.subtotal ?? 0),
    };
  });

  const comparativa_sucursales = sucursales_raw
    .map((s) => {
      const total = s.ventas.reduce((sum, v) => sum + Number(v.total), 0);
      const transacciones = s.ventas.length;
      return {
        id: s.id,
        nombre: s.nombre,
        total,
        transacciones,
        ticket_promedio: transacciones > 0 ? total / transacciones : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const ventas_semana_actual = Number(kpi_semana._sum.total ?? 0);
  const ventas_semana_ant = Number(kpi_semana_anterior._sum.total ?? 0);
  const tendencia_semana =
    ventas_semana_ant > 0
      ? Math.round(((ventas_semana_actual - ventas_semana_ant) / ventas_semana_ant) * 100)
      : null;

  return api_ok({
    ventas_hoy: Number(kpi_hoy._sum.total ?? 0),
    transacciones_hoy: kpi_hoy._count.id,
    ventas_semana: ventas_semana_actual,
    transacciones_semana: kpi_semana._count.id,
    ticket_promedio: Number(kpi_total._avg.total ?? 0),
    total_transacciones: kpi_total._count.id,
    tendencia_semana,
    total_productos,
    clientes_activos,
    faltantes_pendientes,
    ventas_por_dia,
    top_productos,
    comparativa_sucursales,
    productos_en_riesgo: inventario_riesgo_raw
      .filter((inv) => inv.stock_actual <= inv.stock_minimo)
      .slice(0, 8)
      .map((inv) => ({
        id: inv.producto.id,
        nombre: inv.producto.nombre,
        sucursal: inv.sucursal.nombre,
        stock: inv.stock_actual,
        minimo: inv.stock_minimo,
      })),
  });
}
