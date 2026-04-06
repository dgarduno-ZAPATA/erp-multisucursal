import { prisma } from "@/lib/db/prisma";

type MovimientoInput = {
  producto_id: number;
  sucursal_id: number;
  usuario_id?: string | null;
  tipo: "entrada" | "salida" | "ajuste";
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo?: string | null;
  referencia?: string | null;
};

type DbClient = Pick<typeof prisma, "movimientoInventario">;

export async function log_inventory_movement(input: MovimientoInput, db: DbClient = prisma) {
  await db.movimientoInventario.create({
    data: {
      producto_id: input.producto_id,
      sucursal_id: input.sucursal_id,
      usuario_id: input.usuario_id ?? null,
      tipo: input.tipo,
      cantidad: input.cantidad,
      stock_anterior: input.stock_anterior,
      stock_nuevo: input.stock_nuevo,
      motivo: input.motivo ?? null,
      referencia: input.referencia ?? null,
    },
  });
}

export async function get_inventory_movements(params?: {
  sucursal_ids?: number[];
  producto_id?: number;
  limit?: number;
}) {
  const limit = Math.min(100, Math.max(1, params?.limit ?? 30));

  const rows = await prisma.movimientoInventario.findMany({
    where: {
      ...(params?.sucursal_ids?.length ? { sucursal_id: { in: params.sucursal_ids } } : {}),
      ...(params?.producto_id ? { producto_id: params.producto_id } : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit,
    select: {
      id: true,
      tipo: true,
      cantidad: true,
      stock_anterior: true,
      stock_nuevo: true,
      motivo: true,
      referencia: true,
      created_at: true,
      producto: { select: { nombre: true, sku: true } },
      sucursal: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    tipo: row.tipo,
    cantidad: row.cantidad,
    stock_anterior: row.stock_anterior,
    stock_nuevo: row.stock_nuevo,
    motivo: row.motivo,
    referencia: row.referencia,
    created_at: row.created_at.toISOString(),
    producto_nombre: row.producto.nombre,
    producto_sku: row.producto.sku,
    sucursal_nombre: row.sucursal.nombre,
    usuario_nombre: row.usuario?.nombre ?? null,
  }));
}

export async function get_inventory_movements_safe(params?: {
  sucursal_ids?: number[];
  producto_id?: number;
  limit?: number;
}) {
  try {
    const movimientos = await get_inventory_movements(params);
    return {
      movimientos,
      available: true as const,
    };
  } catch (error) {
    console.error("Inventory movements unavailable in current environment", error);
    return {
      movimientos: [],
      available: false as const,
    };
  }
}
