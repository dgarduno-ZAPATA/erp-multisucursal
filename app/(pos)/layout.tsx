import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { get_current_user } from "@/lib/auth/session";
import { can_access } from "@/lib/auth/route-permissions";

const all_navigation = [
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
    href: "/inventario",
    label: "Inventario",
    description: "Consulta de catalogo y detalle del producto.",
  },
  {
    href: "/faltantes",
    label: "Faltantes",
    description: "Reporte y seguimiento de productos no surtidos.",
  },
  {
    href: "/ventas",
    label: "Ventas",
    description: "Historial de tickets y operacion comercial.",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Consulta rapida del CRM y datos de compra.",
  },
  {
    href: "/asistencias",
    label: "Asistencias",
    description: "Horas y presencia por operador.",
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
  const user_rol =
    typeof user?.user_metadata?.rol === "string"
      ? user.user_metadata.rol
      : undefined;
  const navigation = all_navigation.filter((item) => can_access(item.href, user_rol ?? "vendedor"));

  return (
    <AppShell
      title="Punto de venta"
      description="Interfaz base para caja, atencion en mostrador y preparacion del flujo de cobro del MVP."
      sidebar_title="Operacion POS"
      sidebar_subtitle="Accesos rapidos para operar sin tener que volver al dashboard cada vez."
      branch_name={branch_name}
      user_name={user_name}
      user_rol={user_rol}
      navigation={navigation}
      sidebar_footer_note="Ideal para lector de codigo de barras tipo teclado y operacion continua."
    >
      {children}
    </AppShell>
  );
}
