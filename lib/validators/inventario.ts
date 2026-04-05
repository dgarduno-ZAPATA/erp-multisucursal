import { z } from "zod";

export const inventario_id_schema = z.number().int().positive();

export const create_inventario_schema = z.object({
  producto_id: z.number().int().positive(),
  sucursal_id: z.number().int().positive(),
  stock_actual: z.number().int().nonnegative(),
  stock_minimo: z.number().int().nonnegative(),
});

export const update_inventario_schema = create_inventario_schema.partial();

export type CreateInventarioInput = z.infer<typeof create_inventario_schema>;
export type UpdateInventarioInput = z.infer<typeof update_inventario_schema>;
