import type { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { api_err, require_auth } from "@/lib/api/helpers";

export async function GET(_request: NextRequest) {
  const { db_user, error } = await require_auth();
  if (error) return error;

  if (db_user.rol === "vendedor" || db_user.rol === "cajero") {
    return api_err(403, "FORBIDDEN", "Sin permisos para exportar inventario.");
  }

  // Load all products with inventory per sucursal
  const productos = await prisma.producto.findMany({
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      sku: true,
      codigo_barras: true,
      nombre: true,
      categoria: true,
      precio: true,
      costo: true,
      stock_minimo: true,
      activo: true,
      inventario: {
        select: {
          stock_actual: true,
          stock_minimo: true,
          sucursal: { select: { nombre: true } },
        },
        orderBy: { sucursal: { nombre: "asc" } },
      },
    },
  });

  const sucursales_set = new Set<string>();
  for (const p of productos) {
    for (const inv of p.inventario) {
      sucursales_set.add(inv.sucursal.nombre);
    }
  }
  const sucursales = Array.from(sucursales_set).sort();

  // Build rows for the main sheet
  const main_rows = productos.map((p) => {
    const stock_total = p.inventario.reduce((s, i) => s + i.stock_actual, 0);
    const row: Record<string, string | number> = {
      SKU: p.sku,
      "Código de barras": p.codigo_barras ?? "",
      Nombre: p.nombre,
      Categoría: p.categoria,
      "Precio venta": Number(p.precio),
      "Costo": p.costo !== null ? Number(p.costo) : "",
      "Stock total": stock_total,
      "Stock mínimo": p.stock_minimo,
      Estado: p.activo ? "Activo" : "Inactivo",
    };
    for (const sucursal of sucursales) {
      const inv = p.inventario.find((i) => i.sucursal.nombre === sucursal);
      row[`Stock — ${sucursal}`] = inv?.stock_actual ?? 0;
    }
    return row;
  });

  // Build alert rows (stock <= stock_minimo)
  const alert_rows = productos
    .filter((p) => {
      const stock_total = p.inventario.reduce((s, i) => s + i.stock_actual, 0);
      return stock_total <= p.stock_minimo;
    })
    .map((p) => {
      const stock_total = p.inventario.reduce((s, i) => s + i.stock_actual, 0);
      return {
        SKU: p.sku,
        Nombre: p.nombre,
        Categoría: p.categoria,
        "Stock actual": stock_total,
        "Stock mínimo": p.stock_minimo,
        Diferencia: stock_total - p.stock_minimo,
        Alerta: stock_total <= 0 ? "AGOTADO" : "BAJO",
      };
    });

  // Generate workbook with xlsx (server-side, dynamic import avoids client bundle)
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // Sheet 1: full inventory
  const ws_inventario = XLSX.utils.json_to_sheet(main_rows);
  // Set column widths
  ws_inventario["!cols"] = [
    { wch: 14 }, { wch: 18 }, { wch: 36 }, { wch: 18 },
    { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 },
    ...sucursales.map(() => ({ wch: 18 })),
  ];
  XLSX.utils.book_append_sheet(wb, ws_inventario, "Inventario");

  // Sheet 2: alerts
  if (alert_rows.length > 0) {
    const ws_alertas = XLSX.utils.json_to_sheet(alert_rows);
    ws_alertas["!cols"] = [
      { wch: 14 }, { wch: 36 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws_alertas, "Alertas de stock");
  }

  // Metadata sheet
  const meta_rows = [
    { Campo: "Exportado el", Valor: new Date().toLocaleString("es-MX") },
    { Campo: "Total productos", Valor: productos.length },
    { Campo: "Sucursales incluidas", Valor: sucursales.join(", ") || "—" },
    { Campo: "Productos en alerta", Valor: alert_rows.length },
  ];
  const ws_meta = XLSX.utils.json_to_sheet(meta_rows);
  ws_meta["!cols"] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws_meta, "Info");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const date_str = new Date().toISOString().slice(0, 10);
  const filename = `inventario_${date_str}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
