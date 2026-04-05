"use server";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";

export type DashboardFilters = {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: number;
  vendedor_id?: string;
};

type BranchOption = {
  id: number;
  nombre: string;
  codigo: string;
};

type SellerOption = {
  id: string;
  nombre: string;
  rol: "gerente" | "cajero" | "vendedor";
  sucursal: string;
};

function start_of_day(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function end_of_day(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
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

function start_of_month(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parse_day(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function days_ago(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function compare_pct(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function decimal_to_number(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function getDashboardMetrics(filters: DashboardFilters = {}) {
  const now = new Date();
  const default_from = start_of_week(now);
  const default_to = end_of_day(now);
  const period_from = parse_day(filters.fecha_desde, default_from);
  const period_to = end_of_day(parse_day(filters.fecha_hasta, default_to));
  const period_length_days =
    Math.max(1, Math.round((period_to.getTime() - period_from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const previous_period_to = new Date(period_from.getTime() - 1);
  const previous_period_from = start_of_day(
    new Date(period_from.getTime() - period_length_days * 24 * 60 * 60 * 1000),
  );
  const week_from = start_of_week(now);
  const month_from = start_of_month(now);
  const prev_week_from = new Date(week_from);
  prev_week_from.setDate(prev_week_from.getDate() - 7);
  const prev_week_to = new Date(week_from.getTime() - 1);
  const prev_month_from = new Date(month_from.getFullYear(), month_from.getMonth() - 1, 1);
  const prev_month_to = new Date(month_from.getTime() - 1);
  const current_day_of_month = now.getDate();
  const total_days_in_month = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const { sucursales } = await get_accessible_sucursales();
  const branch_ids = sucursales.map((branch) => branch.id);
  const selected_branch_id =
    filters.sucursal_id && branch_ids.includes(filters.sucursal_id) ? filters.sucursal_id : undefined;
  const branch_filter =
    selected_branch_id !== undefined
      ? { sucursal_id: selected_branch_id }
      : branch_ids.length > 0
        ? { sucursal_id: { in: branch_ids } }
        : {};

  const sellers_raw = await prisma.usuario.findMany({
    where: {
      activo: true,
      rol: { in: ["gerente", "cajero", "vendedor"] },
      ...(branch_ids.length > 0 ? { sucursal_id: { in: branch_ids } } : {}),
    },
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      rol: true,
      sucursal: { select: { nombre: true } },
    },
  });

  const sellers: SellerOption[] = sellers_raw.map((seller) => ({
    id: seller.id,
    nombre: seller.nombre,
    rol: seller.rol as "gerente" | "cajero" | "vendedor",
    sucursal: seller.sucursal?.nombre ?? "Sin sucursal base",
  }));
  const selected_seller_id =
    filters.vendedor_id && sellers.some((seller) => seller.id === filters.vendedor_id)
      ? filters.vendedor_id
      : undefined;
  const seller_filter = selected_seller_id ? { usuario_id: selected_seller_id } : {};

  const sales_where = { ...branch_filter, ...seller_filter };
  const shortage_where = { ...branch_filter };
  const inventory_where = { ...branch_filter };
  const attendance_where = { ...branch_filter, ...seller_filter };

  const [
    period_sales,
    previous_period_sales,
    today_sales,
    cancelled_period,
    previous_cancelled_period,
    week_sales,
    prev_week_sales,
    month_sales,
    prev_month_sales,
    sales_7_days,
    grouped_sales_by_branch,
    grouped_prev_sales_by_branch,
    top_products_grouped,
    inventory_risk,
    pending_shortages,
    period_shortages,
    previous_period_shortages,
    all_products,
    detail_rows,
    previous_detail_rows,
    grouped_sales_by_seller,
    grouped_prev_sales_by_seller,
    today_attendance,
    recent_cashboxes,
    previous_cashboxes,
  ] = await Promise.all([
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: period_from, lte: period_to } },
      _sum: { total: true },
      _avg: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: previous_period_from, lte: previous_period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: {
        ...sales_where,
        estado: "completada",
        fecha_venta: { gte: start_of_day(now), lte: end_of_day(now) },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "cancelada", fecha_venta: { gte: period_from, lte: period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "cancelada", fecha_venta: { gte: previous_period_from, lte: previous_period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: week_from, lte: end_of_day(now) } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: prev_week_from, lte: prev_week_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: month_from, lte: end_of_day(now) } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.aggregate({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: prev_month_from, lte: prev_month_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.findMany({
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: days_ago(6), lte: end_of_day(now) } },
      select: { fecha_venta: true, total: true },
      orderBy: { fecha_venta: "asc" },
    }),
    prisma.venta.groupBy({
      by: ["sucursal_id"],
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: period_from, lte: period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.groupBy({
      by: ["sucursal_id"],
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: previous_period_from, lte: previous_period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.detalleVenta.groupBy({
      by: ["producto_id"],
      where: {
        venta: { ...sales_where, estado: "completada", fecha_venta: { gte: period_from, lte: period_to } },
      },
      _sum: { cantidad: true, subtotal: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 10,
    }),
    prisma.inventario.findMany({
      where: inventory_where,
      select: {
        stock_actual: true,
        stock_minimo: true,
        producto: { select: { id: true, nombre: true } },
        sucursal: { select: { nombre: true } },
      },
      orderBy: { stock_actual: "asc" },
      take: 50,
    }),
    prisma.faltante.count({ where: { ...shortage_where, estado: "pendiente" } }),
    prisma.faltante.count({
      where: { ...shortage_where, created_at: { gte: period_from, lte: period_to } },
    }),
    prisma.faltante.count({
      where: { ...shortage_where, created_at: { gte: previous_period_from, lte: previous_period_to } },
    }),
    prisma.producto.findMany({ select: { id: true, nombre: true } }),
    prisma.detalleVenta.findMany({
      where: {
        venta: { ...sales_where, estado: "completada", fecha_venta: { gte: period_from, lte: period_to } },
      },
      select: {
        cantidad: true,
        subtotal: true,
        producto_id: true,
        producto: { select: { nombre: true, costo: true } },
        venta: {
          select: {
            usuario_id: true,
            sucursal_id: true,
          },
        },
      },
    }),
    prisma.detalleVenta.findMany({
      where: {
        venta: { ...sales_where, estado: "completada", fecha_venta: { gte: previous_period_from, lte: previous_period_to } },
      },
      select: {
        cantidad: true,
        subtotal: true,
        producto_id: true,
        producto: { select: { nombre: true, costo: true } },
        venta: {
          select: {
            usuario_id: true,
            sucursal_id: true,
          },
        },
      },
    }),
    prisma.venta.groupBy({
      by: ["usuario_id"],
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: period_from, lte: period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.venta.groupBy({
      by: ["usuario_id"],
      where: { ...sales_where, estado: "completada", fecha_venta: { gte: previous_period_from, lte: previous_period_to } },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.asistenciaVendedor.findMany({
      where: { ...attendance_where, fecha_operativa: start_of_day(now) },
      select: { id: true },
    }),
    prisma.cierreCaja.findMany({
      where: {
        ...branch_filter,
        ...(selected_seller_id ? { usuario_id: selected_seller_id } : {}),
        fecha_operativa: { gte: period_from, lte: period_to },
      },
      orderBy: [{ fecha_operativa: "desc" }, { hora_apertura: "desc" }],
      take: 12,
      select: {
        id: true,
        fecha_operativa: true,
        estado: true,
        monto_inicial: true,
        monto_esperado: true,
        monto_final_declarado: true,
        diferencia: true,
        observaciones_apertura: true,
        observaciones_cierre: true,
        hora_apertura: true,
        hora_cierre: true,
        sucursal: { select: { nombre: true } },
        usuario: { select: { nombre: true, rol: true } },
      },
    }),
    prisma.cierreCaja.findMany({
      where: {
        ...branch_filter,
        ...(selected_seller_id ? { usuario_id: selected_seller_id } : {}),
        fecha_operativa: { gte: previous_period_from, lte: previous_period_to },
      },
      select: {
        estado: true,
        diferencia: true,
      },
    }),
  ]);

  const total_period = Number(period_sales._sum.total ?? 0);
  const total_cancelled = Number(cancelled_period._sum.total ?? 0);
  const product_names = new Map<number, string>(all_products.map((product) => [product.id, product.nombre]));

  const day_labels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const ventas_por_dia: { label: string; fecha: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = days_ago(i);
    const date_key = date.toISOString().slice(0, 10);
    const total = sales_7_days
      .filter((sale) => sale.fecha_venta.toISOString().slice(0, 10) === date_key)
      .reduce((sum, sale) => sum + Number(sale.total), 0);
    ventas_por_dia.push({ label: day_labels[date.getDay()], fecha: date_key, total });
  }

  const grouped_branch_totals = new Map<number, { total: number; transacciones: number }>(
    grouped_sales_by_branch.map((row) => [
      row.sucursal_id,
      { total: Number(row._sum.total ?? 0), transacciones: row._count.id },
    ]),
  );
  const grouped_prev_branch_totals = new Map<number, { total: number; transacciones: number }>(
    grouped_prev_sales_by_branch.map((row) => [
      row.sucursal_id,
      { total: Number(row._sum.total ?? 0), transacciones: row._count.id },
    ]),
  );
  const comparativa_sucursales = sucursales
    .map((branch: BranchOption) => {
      const stats = grouped_branch_totals.get(branch.id) ?? { total: 0, transacciones: 0 };
      const prev_stats = grouped_prev_branch_totals.get(branch.id) ?? { total: 0, transacciones: 0 };
      return {
        id: branch.id,
        nombre: branch.nombre,
        total: stats.total,
        total_anterior: prev_stats.total,
        comparativo: compare_pct(stats.total, prev_stats.total),
        transacciones: stats.transacciones,
        ticket_promedio: stats.transacciones > 0 ? stats.total / stats.transacciones : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const margin_by_branch = new Map<number, number>();
  const margin_by_product = new Map<number, { nombre: string; total: number; unidades: number }>();
  const margin_by_seller = new Map<string, number>();
  for (const row of detail_rows) {
    const subtotal = Number(row.subtotal);
    const cost = Number(row.producto.costo ?? 0) * row.cantidad;
    const margin = subtotal - cost;
    margin_by_branch.set(row.venta.sucursal_id, (margin_by_branch.get(row.venta.sucursal_id) ?? 0) + margin);
    margin_by_seller.set(row.venta.usuario_id, (margin_by_seller.get(row.venta.usuario_id) ?? 0) + margin);
    const current_product = margin_by_product.get(row.producto_id) ?? {
      nombre: row.producto.nombre,
      total: 0,
      unidades: 0,
    };
    margin_by_product.set(row.producto_id, {
      nombre: current_product.nombre,
      total: current_product.total + margin,
      unidades: current_product.unidades + row.cantidad,
    });
  }
  let previous_margin_total = 0;
  for (const row of previous_detail_rows) {
    const subtotal = Number(row.subtotal);
    const cost = Number(row.producto.costo ?? 0) * row.cantidad;
    previous_margin_total += subtotal - cost;
  }

  const margen_por_sucursal = comparativa_sucursales.map((branch) => ({
    id: branch.id,
    nombre: branch.nombre,
    margen: margin_by_branch.get(branch.id) ?? 0,
    total: branch.total,
  }));

  const margen_por_producto = Array.from(margin_by_product.entries())
    .map(([product_id, values]) => ({
      producto_id: product_id,
      nombre: values.nombre || product_names.get(product_id) || `Producto #${product_id}`,
      margen: values.total,
      unidades: values.unidades,
    }))
    .sort((a, b) => b.margen - a.margen)
    .slice(0, 12);

  const top_productos = top_products_grouped.map((row) => ({
    producto_id: row.producto_id,
    nombre: product_names.get(row.producto_id) ?? `Producto #${row.producto_id}`,
    unidades: row._sum.cantidad ?? 0,
    monto: Number(row._sum.subtotal ?? 0),
  }));

  const grouped_prev_seller_totals = new Map<string, { total: number; tickets: number }>(
    grouped_prev_sales_by_seller.map((row) => [
      row.usuario_id,
      { total: Number(row._sum.total ?? 0), tickets: row._count.id },
    ]),
  );

  const rendimiento_vendedores = grouped_sales_by_seller
    .map((row) => {
      const seller = sellers.find((item) => item.id === row.usuario_id);
      if (!seller) return null;
      const total = Number(row._sum.total ?? 0);
      const tickets = row._count.id;
      const prev_stats = grouped_prev_seller_totals.get(row.usuario_id) ?? { total: 0, tickets: 0 };
      return {
        usuario_id: row.usuario_id,
        nombre: seller.nombre,
        rol: seller.rol,
        sucursal: seller.sucursal,
        total,
        total_anterior: prev_stats.total,
        comparativo: compare_pct(total, prev_stats.total),
        tickets,
        ticket_promedio: tickets > 0 ? total / tickets : 0,
        margen_estimado: margin_by_seller.get(row.usuario_id) ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const resumen_caja = {
    cierres_count: recent_cashboxes.length,
    cierres_count_anterior: previous_cashboxes.length,
    comparativo_cierres: compare_pct(recent_cashboxes.length, previous_cashboxes.length),
    cajas_abiertas: recent_cashboxes.filter((item) => item.estado === "abierta").length,
    cajas_abiertas_anterior: previous_cashboxes.filter((item) => item.estado === "abierta").length,
    diferencias_abs: recent_cashboxes.reduce(
      (sum, item) => sum + Math.abs(decimal_to_number(item.diferencia)),
      0,
    ),
    diferencias_abs_anterior: previous_cashboxes.reduce(
      (sum, item) => sum + Math.abs(decimal_to_number(item.diferencia)),
      0,
    ),
    cierres_con_diferencia: recent_cashboxes.filter(
      (item) => decimal_to_number(item.diferencia) !== 0,
    ).length,
    cierres_con_diferencia_anterior: previous_cashboxes.filter(
      (item) => decimal_to_number(item.diferencia) !== 0,
    ).length,
  };

  const ventas_mes_actual = Number(month_sales._sum.total ?? 0);
  const run_rate_diario = current_day_of_month > 0 ? ventas_mes_actual / current_day_of_month : 0;
  const proyeccion_cierre_mes = run_rate_diario * total_days_in_month;
  const objetivo_ritmo_mes = total_days_in_month > 0
    ? (ventas_mes_actual / total_days_in_month) * current_day_of_month
    : ventas_mes_actual;
  const brecha_ritmo_mes = ventas_mes_actual - objetivo_ritmo_mes;
  const comparativo_proyeccion_mes = compare_pct(
    proyeccion_cierre_mes,
    Number(prev_month_sales._sum.total ?? 0),
  );
  const alerta_proyeccion =
    proyeccion_cierre_mes <= 0
      ? "sin_datos"
      : comparativo_proyeccion_mes !== null && comparativo_proyeccion_mes < -10
        ? "critica"
        : comparativo_proyeccion_mes !== null && comparativo_proyeccion_mes < 5
          ? "vigilancia"
          : "saludable";

  return {
    filtros: {
      fecha_desde: period_from.toISOString().slice(0, 10),
      fecha_hasta: period_to.toISOString().slice(0, 10),
      sucursal_id: selected_branch_id ?? null,
      vendedor_id: selected_seller_id ?? null,
    },
    catalogos: {
      sucursales,
      vendedores: sellers,
    },
    resumen: {
      total_periodo: total_period,
      total_periodo_anterior: Number(previous_period_sales._sum.total ?? 0),
      transacciones_periodo: period_sales._count.id,
      transacciones_periodo_anterior: previous_period_sales._count.id,
      ticket_promedio: Number(period_sales._avg.total ?? 0),
      margen_estimado: Array.from(margin_by_branch.values()).reduce((sum, value) => sum + value, 0),
      margen_estimado_anterior: previous_margin_total,
      total_cancelado: total_cancelled,
      cancelaciones_count: cancelled_period._count.id,
      total_cancelado_anterior: Number(previous_cancelled_period._sum.total ?? 0),
      cancelaciones_count_anterior: previous_cancelled_period._count.id,
      ventas_hoy: Number(today_sales._sum.total ?? 0),
      transacciones_hoy: today_sales._count.id,
      faltantes_pendientes: pending_shortages,
      faltantes_periodo: period_shortages,
      faltantes_periodo_anterior: previous_period_shortages,
      asistencias_hoy: today_attendance.length,
      tendencia_periodo: null as number | null,
      productividad_hora: 0,
      sucursal_top: comparativa_sucursales[0] ?? null,
      vendedor_top: rendimiento_vendedores[0] ?? null,
      max_total: comparativa_sucursales[0]?.total ?? 0,
      ventas_semana: Number(week_sales._sum.total ?? 0),
      ventas_mes: Number(month_sales._sum.total ?? 0),
      comparativo_semana: compare_pct(Number(week_sales._sum.total ?? 0), Number(prev_week_sales._sum.total ?? 0)),
      comparativo_mes: compare_pct(Number(month_sales._sum.total ?? 0), Number(prev_month_sales._sum.total ?? 0)),
      transacciones_semana: week_sales._count.id,
      transacciones_mes: month_sales._count.id,
      proyeccion_cierre_mes,
      run_rate_diario,
      dias_transcurridos_mes: current_day_of_month,
      dias_totales_mes: total_days_in_month,
      brecha_ritmo_mes,
      comparativo_proyeccion_mes,
      alerta_proyeccion,
    },
    ventas_por_dia,
    top_productos,
    comparativa_sucursales,
    rendimiento_vendedores,
    margen_por_sucursal,
    margen_por_producto,
    resumen_caja,
    comparativos_modulos: {
      ventas: {
        actual: total_period,
        anterior: Number(previous_period_sales._sum.total ?? 0),
        delta: compare_pct(total_period, Number(previous_period_sales._sum.total ?? 0)),
      },
      caja: {
        actual: recent_cashboxes.length,
        anterior: previous_cashboxes.length,
        delta: compare_pct(recent_cashboxes.length, previous_cashboxes.length),
      },
      metas: {
        actual: 0,
        anterior: 0,
        delta: null as number | null,
      },
      inventario: {
        actual: period_shortages,
        anterior: previous_period_shortages,
        delta: compare_pct(period_shortages, previous_period_shortages),
        margen_actual: Array.from(margin_by_branch.values()).reduce((sum, value) => sum + value, 0),
        margen_anterior: previous_margin_total,
        margen_delta: compare_pct(
          Array.from(margin_by_branch.values()).reduce((sum, value) => sum + value, 0),
          previous_margin_total,
        ),
      },
    },
    cierres_caja: recent_cashboxes.map((item) => ({
      id: item.id,
      fecha_operativa: item.fecha_operativa.toISOString().slice(0, 10),
      estado: item.estado,
      sucursal_nombre: item.sucursal.nombre,
      operador_nombre: item.usuario.nombre,
      operador_rol: item.usuario.rol,
      monto_inicial: decimal_to_number(item.monto_inicial),
      monto_esperado: item.monto_esperado !== null ? decimal_to_number(item.monto_esperado) : null,
      monto_final_declarado:
        item.monto_final_declarado !== null ? decimal_to_number(item.monto_final_declarado) : null,
      diferencia: item.diferencia !== null ? decimal_to_number(item.diferencia) : null,
      observaciones_apertura: item.observaciones_apertura,
      observaciones_cierre: item.observaciones_cierre,
      hora_apertura: item.hora_apertura.toISOString(),
      hora_cierre: item.hora_cierre?.toISOString() ?? null,
    })),
    productosEnRiesgo: inventory_risk
      .filter((item) => item.stock_actual <= item.stock_minimo)
      .slice(0, 8)
      .map((item) => ({
        id: item.producto.id,
        nombre: item.producto.nombre,
        sucursal: item.sucursal.nombre,
        stock: item.stock_actual,
        minimo: item.stock_minimo,
      })),
  };
}
