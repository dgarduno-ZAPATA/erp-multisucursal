import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { get_current_user } from "@/lib/auth/session";

const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "KPIs, ventas del dia y alertas operativas.",
  },
  {
    href: "/dashboard/analitica",
    label: "Analitica",
    description: "Centro de analisis para direccion, ventas, caja y metas.",
  },
  {
    href: "/pos",
    label: "POS",
    description: "Punto de venta rapido para caja y mostrador.",
  },
  {
    href: "/inventario",
    label: "Inventario",
    description: "Catalogo de productos, stock y entradas.",
  },
  {
    href: "/inventario/proveedores",
    label: "Proveedores",
    description: "Quién te surte, cuándo viene, órdenes de compra y cuentas por pagar.",
  },
  {
    href: "/ventas",
    label: "Ventas",
    description: "Historial operativo, tickets y cancelaciones.",
  },
  {
    href: "/asistencias",
    label: "Asistencias",
    description: "Horas, retardos y presencia por vendedor y sucursal.",
  },
  {
    href: "/faltantes",
    label: "Faltantes",
    description: "Demanda insatisfecha y perdida estimada.",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "CRM, historial de compras y LTV.",
  },
  {
    href: "/configuracion/usuarios",
    label: "Configuracion",
    description: "Usuarios, roles y PINs de operador.",
  },
  {
    href: "/configuracion/impresora",
    label: "Impresora",
    description: "Parear impresora termica Bluetooth y configurar ancho de papel.",
  },
];

type DashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
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

  return (
    <AppShell
      title="Dashboard ejecutivo"
      description="Vista principal del ERP para monitorear ventas, catalogo, clientes y alertas operativas desde una sola interfaz."
      sidebar_title="Operacion central"
      sidebar_subtitle="Navegacion base del panel administrativo lista para escalar por modulo."
      branch_name={branch_name}
      user_name={user_name}
      user_rol={user_rol}
      navigation={navigation}
    >
      {children}
    </AppShell>
  );
}
