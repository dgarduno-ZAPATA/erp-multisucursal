import { z } from "zod";

export const estado_venta_schema = z.enum(["pendiente", "completada", "cancelada"]);
export const venta_id_schema = z.number().int().positive();
export const detalle_venta_id_schema = z.number().int().positive();
export const usuario_id_schema = z.string().uuid();

export const detalle_venta_schema = z.object({
  producto_id: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precio_unitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export const create_venta_schema = z.object({
  sucursal_id: z.number().int().positive(),
  usuario_id: usuario_id_schema,
  cliente_id: z.number().int().positive().nullable().optional(),
  folio: z.string().trim().min(1).max(50),
  subtotal: z.number().nonnegative(),
  descuento: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  estado: estado_venta_schema.optional(),
  fecha_venta: z.string().datetime().optional(),
  detalle_ventas: z.array(detalle_venta_schema).min(1),
});

export const update_venta_schema = z.object({
  estado: estado_venta_schema.optional(),
  cliente_id: z.number().int().positive().nullable().optional(),
});

export type DetalleVentaInput = z.infer<typeof detalle_venta_schema>;
export type CreateVentaInput = z.infer<typeof create_venta_schema>;
export type UpdateVentaInput = z.infer<typeof update_venta_schema>;
