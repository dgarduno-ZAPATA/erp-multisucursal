"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { require_roles } from "@/lib/auth/rbac";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { get_current_db_user } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";
import { log_inventory_movement } from "@/lib/inventory/movements";

export type ConteoProducto = {
  inventario_id: number;
  producto_id: number;
  nombre: string;
  sku: string;
  categoria: string;
  stock_sistema: number;
  stock_minimo: number;
};

export async function get_conteo_productos(sucursal_id: number): Promise<ConteoProducto[]> {
  const { sucursales } = await get_accessible_sucursales();
  const accessible = sucursales.some((s) => s.id === sucursal_id);
  if (!accessible) return [];

  const rows = await prisma.inventario.findMany({
    where: {
      sucursal_id,
      producto: { activo: true },
    },
    orderBy: { producto: { nombre: "asc" } },
    select: {
      id: true,
      producto_id: true,
      stock_actual: true,
      stock_minimo: true,
      producto: {
        select: {
          nombre: true,
          sku: true,
          categoria: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    inventario_id: row.id,
    producto_id: row.producto_id,
    nombre: row.producto.nombre,
    sku: row.producto.sku,
    categoria: row.producto.categoria,
    stock_sistema: row.stock_actual,
    stock_minimo: row.stock_minimo,
  }));
}

export async function ejecutar_conteo_fisico(formData: FormData) {
  await require_roles(["admin", "gerente"]);

  const sucursal_id = Number(formData.get("sucursal_id") ?? 0);
  if (!Number.isInteger(sucursal_id) || sucursal_id <= 0) {
    redirect("/inventario/conteo?error=Sucursal+invalida.");
  }

  const { sucursales } = await get_accessible_sucursales();
  if (!sucursales.some((s) => s.id === sucursal_id)) {
    redirect("/inventario/conteo?error=Sin+acceso+a+esa+sucursal.");
  }

  const current_user = await get_current_db_user();
  const referencia = `CONTEO-${sucursal_id}-${Date.now()}`;

  // Collect all conteo_* entries from form
  const ajustes: { inventario_id: number; stock_fisico: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("conteo_")) continue;
    const inventario_id = Number(key.replace("conteo_", ""));
    const stock_fisico = Number(value);
    if (!Number.isInteger(inventario_id) || inventario_id <= 0) continue;
    if (!Number.isFinite(stock_fisico) || stock_fisico < 0) continue;
    ajustes.push({ inventario_id, stock_fisico });
  }

  if (ajustes.length === 0) {
    redirect("/inventario/conteo?sucursal_id=" + sucursal_id + "&error=No+se+recibieron+conteos.");
  }

  // Load current stock from DB for all inventario records in this sucursal
  const inventario_records = await prisma.inventario.findMany({
    where: {
      id: { in: ajustes.map((a) => a.inventario_id) },
      sucursal_id,
    },
    select: { id: true, producto_id: true, stock_actual: true },
  });

  const stock_map = new Map(inventario_records.map((r) => [r.id, r]));

  let ajustes_aplicados = 0;

  for (const { inventario_id, stock_fisico } of ajustes) {
    const record = stock_map.get(inventario_id);
    if (!record) continue;

    const diff = stock_fisico - record.stock_actual;
    if (diff === 0) continue; // No discrepancy — skip

    await prisma.inventario.update({
      where: { id: inventario_id },
      data: { stock_actual: stock_fisico },
    });

    await log_inventory_movement({
      producto_id: record.producto_id,
      sucursal_id,
      usuario_id: current_user?.id ?? null,
      tipo: "ajuste",
      cantidad: diff,
      stock_anterior: record.stock_actual,
      stock_nuevo: stock_fisico,
      motivo: "Conteo fisico",
      referencia,
    });

    ajustes_aplicados++;
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/conteo");
  redirect(
    `/inventario/conteo?sucursal_id=${sucursal_id}&ok=${ajustes_aplicados}`,
  );
}
