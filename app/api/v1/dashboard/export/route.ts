import type { NextRequest } from "next/server";

import { getDashboardMetrics } from "@/actions/dashboard";
import { getSalesGoalsSummary } from "@/actions/metas";
import { api_err, require_auth } from "@/lib/api/helpers";

type ExportView = "all" | "direccion" | "ventas" | "caja" | "metas" | "inventario";

function parse_number(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parse_view(value: string | null): ExportView {
  if (
    value === "direccion" ||
    value === "ventas" ||
    value === "caja" ||
    value === "metas" ||
    value === "inventario"
  ) {
    return value;
  }

  return "all";
}

export async function GET(request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  if (db_user.rol !== "admin" && db_user.rol !== "gerente") {
    return api_err(403, "FORBIDDEN", "Sin permisos para exportar el dashboard.");
  }

  const { searchParams } = new URL(request.url);
  const filters = {
    fecha_desde: searchParams.get("fecha_desde") ?? undefined,
    fecha_hasta: searchParams.get("fecha_hasta") ?? undefined,
    sucursal_id: parse_number(searchParams.get("sucursal_id")),
    vendedor_id: searchParams.get("vendedor_id") ?? undefined,
  };
  const export_view = parse_view(searchParams.get("vista"));

  const [metrics, goals] = await Promise.all([
    getDashboardMetrics(filters),
    getSalesGoalsSummary(filters),
  ]);

  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const resumen_rows = [
    { Indicador: "Ventas del periodo", Valor: metrics.resumen.total_periodo },
    { Indicador: "Ventas hoy", Valor: metrics.resumen.ventas_hoy },
    { Indicador: "Ticket promedio", Valor: metrics.resumen.ticket_promedio },
    { Indicador: "Margen estimado", Valor: metrics.resumen.margen_estimado },
    { Indicador: "Cancelaciones", Valor: metrics.resumen.cancelaciones_count },
    { Indicador: "Total cancelado", Valor: metrics.resumen.total_cancelado },
    { Indicador: "Ventas semana", Valor: metrics.resumen.ventas_semana },
    { Indicador: "Ventas mes", Valor: metrics.resumen.ventas_mes },
    { Indicador: "Proyeccion cierre mes", Valor: metrics.resumen.proyeccion_cierre_mes },
    { Indicador: "Run rate diario", Valor: metrics.resumen.run_rate_diario },
    { Indicador: "Brecha ritmo mes", Valor: metrics.resumen.brecha_ritmo_mes },
    { Indicador: "Alerta proyeccion", Valor: metrics.resumen.alerta_proyeccion },
    { Indicador: "Asistencias hoy", Valor: metrics.resumen.asistencias_hoy },
    { Indicador: "Faltantes pendientes", Valor: metrics.resumen.faltantes_pendientes },
  ];
  if (export_view === "all" || export_view === "direccion") {
    const ws_resumen = XLSX.utils.json_to_sheet(resumen_rows);
    ws_resumen["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws_resumen, "Resumen");
  }

  const vendedores_rows = metrics.rendimiento_vendedores.map((item) => ({
    Operador: item.nombre,
    Rol: item.rol,
    Sucursal: item.sucursal,
    Tickets: item.tickets,
    "Ticket promedio": item.ticket_promedio,
    "Margen estimado": item.margen_estimado,
    "Venta total": item.total,
  }));
  if (export_view === "all" || export_view === "ventas" || export_view === "direccion") {
    const ws_vendedores = XLSX.utils.json_to_sheet(vendedores_rows);
    ws_vendedores["!cols"] = [
      { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws_vendedores, "Vendedores");
  }

  const sucursales_rows = metrics.comparativa_sucursales.map((item) => ({
    Sucursal: item.nombre,
    Ventas: item.total,
    Transacciones: item.transacciones,
    "Ticket promedio": item.ticket_promedio,
  }));
  if (export_view === "all" || export_view === "ventas" || export_view === "direccion") {
    const ws_sucursales = XLSX.utils.json_to_sheet(sucursales_rows);
    ws_sucursales["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws_sucursales, "Sucursales");
  }

  const cierres_rows = metrics.cierres_caja.map((item) => ({
    Fecha: item.fecha_operativa,
    Sucursal: item.sucursal_nombre,
    Operador: item.operador_nombre,
    Rol: item.operador_rol,
    Estado: item.estado,
    "Monto inicial": item.monto_inicial,
    Esperado: item.monto_esperado ?? item.monto_inicial,
    Declarado: item.monto_final_declarado ?? 0,
    Diferencia: item.diferencia ?? 0,
    "Obs. apertura": item.observaciones_apertura ?? "",
    "Obs. cierre": item.observaciones_cierre ?? "",
  }));
  if (export_view === "all" || export_view === "caja" || export_view === "direccion") {
    const ws_cierres = XLSX.utils.json_to_sheet(cierres_rows);
    ws_cierres["!cols"] = [
      { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 26 },
    ];
    XLSX.utils.book_append_sheet(wb, ws_cierres, "Cierres caja");
  }

  const metas_rows = goals.metas.map((item) => ({
    Meta: item.nombre,
    Tipo: item.tipo,
    Cadencia: item.cadencia,
    Estatus: item.estatus,
    Referencia: item.usuario_nombre ?? item.sucursal_nombre ?? "",
    "Fecha inicio": item.fecha_inicio,
    "Fecha fin": item.fecha_fin,
    Objetivo: item.monto_objetivo,
    Actual: item.monto_actual,
    Porcentaje: item.porcentaje,
    Faltante: item.faltante,
    Tickets: item.tickets,
  }));
  if (export_view === "all" || export_view === "metas" || export_view === "direccion") {
    const ws_metas = XLSX.utils.json_to_sheet(metas_rows);
    ws_metas["!cols"] = [
      { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 24 }, { wch: 12 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws_metas, "Metas");
  }

  const productos_rows = metrics.margen_por_producto.map((item) => ({
    Producto: item.nombre,
    Unidades: item.unidades,
    Margen: item.margen,
  }));
  if (export_view === "all" || export_view === "inventario" || export_view === "direccion") {
    const ws_productos = XLSX.utils.json_to_sheet(productos_rows);
    ws_productos["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws_productos, "Margen producto");
  }

  if (export_view === "inventario") {
    const riesgo_rows = metrics.productosEnRiesgo.map((item) => ({
      Producto: item.nombre,
      Sucursal: item.sucursal,
      Stock: item.stock,
      Minimo: item.minimo,
    }));
    const ws_riesgo = XLSX.utils.json_to_sheet(riesgo_rows);
    ws_riesgo["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws_riesgo, "Stock riesgo");
  }

  if (export_view === "ventas") {
    const productos_top_rows = metrics.top_productos.map((item) => ({
      Producto: item.nombre,
      Unidades: item.unidades,
      Monto: item.monto,
    }));
    const ws_productos_top = XLSX.utils.json_to_sheet(productos_top_rows);
    ws_productos_top["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws_productos_top, "Top productos");
  }

  const info_rows = [
    { Campo: "Exportado el", Valor: new Date().toLocaleString("es-MX") },
    { Campo: "Usuario", Valor: db_user.id },
    { Campo: "Rol", Valor: db_user.rol },
    { Campo: "Vista exportada", Valor: export_view === "all" ? "completa" : export_view },
    { Campo: "Fecha desde", Valor: metrics.filtros.fecha_desde },
    { Campo: "Fecha hasta", Valor: metrics.filtros.fecha_hasta },
    { Campo: "Sucursal", Valor: metrics.catalogos.sucursales.find((s) => s.id === metrics.filtros.sucursal_id)?.nombre ?? "Todas" },
    { Campo: "Operador", Valor: metrics.catalogos.vendedores.find((v) => v.id === metrics.filtros.vendedor_id)?.nombre ?? "Todos" },
  ];
  const ws_info = XLSX.utils.json_to_sheet(info_rows);
  ws_info["!cols"] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws_info, "Info");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date_str = new Date().toISOString().slice(0, 10);
  const filename = `dashboard_${export_view === "all" ? "gerencial" : export_view}_${date_str}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
