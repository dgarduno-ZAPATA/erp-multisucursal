import { z } from "zod";

export const producto_id_schema = z.number().int().positive();

export const create_producto_schema = z.object({
  sku: z.string().trim().min(1).max(80),
  nombre: z.string().trim().min(1).max(160),
  descripcion: z.string().trim().max(5000).nullable().optional(),
  precio: z.number().positive(),
  costo: z.number().nonnegative().nullable().optional(),
  activo: z.boolean().optional(),
});

export const update_producto_schema = create_producto_schema.partial();

export type CreateProductoInput = z.infer<typeof create_producto_schema>;
export type UpdateProductoInput = z.infer<typeof update_producto_schema>;
