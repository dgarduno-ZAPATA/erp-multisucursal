import type { UserRole } from "@/types/auth";

export type EstadoVenta = "pendiente" | "completada" | "cancelada";
export type EstadoFaltante = "pendiente" | "atendido";

export type BaseEntity = {
  id: number;
  created_at: string;
  updated_at: string;
};

export type Sucursal = BaseEntity & {
  nombre: string;
  codigo: string;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
};

export type Usuario = {
  id: string;
  sucursal_id: number | null;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type Producto = BaseEntity & {
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo: number | null;
  activo: boolean;
};

export type Inventario = BaseEntity & {
  producto_id: number;
  sucursal_id: number;
  stock_actual: number;
  stock_minimo: number;
};

export type Cliente = BaseEntity & {
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
};

export type Venta = BaseEntity & {
  sucursal_id: number;
  usuario_id: string;
  cliente_id: number | null;
  folio: string;
  subtotal: number;
  descuento: number;
  total: number;
  estado: EstadoVenta;
  fecha_venta: string;
};

export type DetalleVenta = BaseEntity & {
  venta_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export type Faltante = BaseEntity & {
  producto_id: number;
  sucursal_id: number;
  usuario_id: string | null;
  cantidad_faltante: number;
  motivo: string | null;
  estado: EstadoFaltante;
};
