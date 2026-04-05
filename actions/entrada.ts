"use server";

import { require_roles } from "@/lib/auth/rbac";
import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";

export type ProductoEntrada = {
  id: number;
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  categoria: string;
  stock_minimo: number;
  inventario: {
    inventario_id: number;
    sucursal_id: number;
    sucursal_nombre: string;
    stock_actual: number;
  }[];
};

export async function buscar_producto_por_barcode(
  barcode: string,
): Promise<ProductoEntrada | null> {
  await require_roles(["admin", "gerente"]);

  const code = barcode.trim();
  if (!code) return null;

  const { sucursales } = await get_accessible_sucursales();
  const sucursal_ids = sucursales.map((s) => s.id);

  const producto = await prisma.producto.findUnique({
    where: { codigo_barras: code },
    select: {
      id: true,
      sku: true,
      codigo_barras: true,
      nombre: true,
      categoria: true,
      stock_minimo: true,
      inventario: {
        where: { sucursal_id: { in: sucursal_ids } },
        select: {
          id: true,
          sucursal_id: true,
          stock_actual: true,
          sucursal: { select: { nombre: true } },
        },
      },
    },
  });

  if (!producto) return null;

  return {
    id: producto.id,
    sku: producto.sku,
    codigo_barras: producto.codigo_barras,
    nombre: producto.nombre,
    categoria: producto.categoria,
    stock_minimo: producto.stock_minimo,
    inventario: producto.inventario.map((inv) => ({
      inventario_id: inv.id,
      sucursal_id: inv.sucursal_id,
      sucursal_nombre: inv.sucursal.nombre,
      stock_actual: inv.stock_actual,
    })),
  };
}
