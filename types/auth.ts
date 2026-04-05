export type UserRole = "admin" | "gerente" | "cajero" | "vendedor";

export type SessionUser = {
  id: string;
  email: string;
  nombre?: string | null;
  rol?: UserRole | null;
  sucursal_id?: number | null;
};

export type SessionState = {
  user: SessionUser | null;
  is_authenticated: boolean;
};
