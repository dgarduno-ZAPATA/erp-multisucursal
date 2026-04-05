import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { get_current_user } from "@/lib/auth/session";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Volver al resumen general del negocio.",
  },
  {
    href: "/pos",
    label: "POS",
    description: "Operacion de caja y flujo de venta rapido.",
  },
  {
    href: "/api/v1/ventas",
    label: "Ventas API",
    description: "Placeholder del endpoint de ventas.",
  },
  {
    href: "/api/v1/clientes",
    label: "Clientes API",
    description: "Base para CRM y datos del cliente.",
  },
];

type PosLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function PosLayout({ children }: PosLayoutProps) {
  const user = await get_current_user();
  const user_name =
    typeof user?.user_metadata?.nombre === "string"
      ? user.user_metadata.nombre
      : user?.email ?? "Usuario activo";
  const branch_name =
    typeof user?.user_metadata?.sucursal_nombre === "string"
      ? user.user_metadata.sucursal_nombre
      : "Sucursal principal";

  return (
    <AppShell
      title="Punto de venta"
      description="Interfaz base para caja, atencion en mostrador y preparacion del flujo de cobro del MVP."
      sidebar_title="Operacion POS"
      sidebar_subtitle="Shell visual enfocado en velocidad, lectura clara y futura expansion del checkout."
      branch_name={branch_name}
      user_name={user_name}
      navigation={navigation}
    >
      {children}
    </AppShell>
  );
}
