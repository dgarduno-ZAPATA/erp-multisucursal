import { z } from "zod";

export const estado_faltante_schema = z.enum(["pendiente", "atendido"]);
export const faltante_id_schema = z.number().int().positive();
export const uuid_schema = z.string().uuid();

export const create_faltante_schema = z.object({
  producto_id: z.number().int().positive(),
  sucursal_id: z.number().int().positive(),
  usuario_id: uuid_schema.nullable().optional(),
  cantidad_faltante: z.number().int().positive(),
  motivo: z.string().trim().max(5000).nullable().optional(),
  estado: estado_faltante_schema.optional(),
});

export const update_faltante_schema = create_faltante_schema.partial();

export type CreateFaltanteInput = z.infer<typeof create_faltante_schema>;
export type UpdateFaltanteInput = z.infer<typeof update_faltante_schema>;
