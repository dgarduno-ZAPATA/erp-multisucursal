import { z } from "zod";

export const cliente_id_schema = z.number().int().positive();

export const create_cliente_schema = z.object({
  nombre: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(160).nullable().optional(),
  telefono: z.string().trim().min(1).max(30).nullable().optional(),
  direccion: z.string().trim().max(1000).nullable().optional(),
  activo: z.boolean().optional(),
});

export const update_cliente_schema = create_cliente_schema.partial();

export type CreateClienteInput = z.infer<typeof create_cliente_schema>;
export type UpdateClienteInput = z.infer<typeof update_cliente_schema>;
