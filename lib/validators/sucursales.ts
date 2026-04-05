import { z } from "zod";

export const sucursal_id_schema = z.number().int().positive();

export const create_sucursal_schema = z.object({
  nombre: z.string().trim().min(1).max(120),
  codigo: z.string().trim().min(1).max(40),
  direccion: z.string().trim().max(1000).nullable().optional(),
  telefono: z.string().trim().min(1).max(30).nullable().optional(),
  activo: z.boolean().optional(),
});

export const update_sucursal_schema = create_sucursal_schema.partial();

export type CreateSucursalInput = z.infer<typeof create_sucursal_schema>;
export type UpdateSucursalInput = z.infer<typeof update_sucursal_schema>;
