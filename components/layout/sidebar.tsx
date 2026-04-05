"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarItem = {
  href: string;
  label: string;
  description: string;
};

type SidebarProps = {
  items: SidebarItem[];
  title: string;
  subtitle: string;
};

// Icon map: label → SVG path(s)
const ICONS: Record<string, string> = {
  Dashboard:     "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  POS:           "M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.2 5H21l-1.68 9.39a2 2 0 0 1-1.97 1.61H8.48a2 2 0 0 1-1.98-1.72L5.2 5zM3 3H1",
  Inventario:    "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 3h16M4 17h16M9 21h6",
  Proveedores:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8 4a3 3 0 0 1 0 6M23 21v-2a4 4 0 0 0-3-3.87",
  Ventas:        "M3 3h18M9 3v18M3 9h6M3 15h6M15 3l-3 18M21 3l-3 18",
  Asistencias:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  Faltantes:     "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  Clientes:      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  Configuracion: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 15 9a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 15z",
  Impresora:     "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
};

function NavIcon({ label }: { label: string }) {
  const d = ICONS[label];
  if (!d) return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d={d} />
    </svg>
  );
}

const base_navigation: SidebarItem[] = [
  { href: "/dashboard",  label: "Dashboard",  description: "Resumen operativo y atajos del sistema." },
  { href: "/pos",        label: "POS",        description: "Punto de venta rapido para caja y mostrador." },
  { href: "/inventario", label: "Inventario", description: "Catalogo de productos y stock real." },
];

function NavItems({ items, on_click }: { items: SidebarItem[]; on_click?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            onClick={on_click}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
            style={{
              background: active ? "rgba(245,158,11,0.12)" : "transparent",
              border: active ? "1px solid rgba(245,158,11,0.18)" : "1px solid transparent",
            }}
          >
            <span style={{ color: active ? "#f59e0b" : "#52525b" }} className="transition-colors group-hover:text-amber-400">
              <NavIcon label={item.label} />
            </span>
            <div className="min-w-0">
              <div
                className="text-sm font-semibold truncate transition-colors"
                style={{ color: active ? "#fafaf9" : "#a1a1aa" }}
              >
                {item.label}
              </div>
            </div>
            {active && (
              <div className="ml-auto w-1 h-1 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, title, subtitle }: SidebarProps) {
  const [open, set_open] = useState(false);

  const extra_items = items.filter(
    (item) => !base_navigation.some((base) => base.href === item.href || base.label === item.label),
  );
  const navigation_items = [...base_navigation, ...extra_items];

  const sidebar_header = (
    <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
        <span
          className="text-[10px] font-bold uppercase tracking-[0.3em]"
          style={{ color: "#52525b" }}
        >
          ERP Multi-Sucursal
        </span>
      </div>
      <h2
        className="mt-4 text-lg font-bold tracking-tight"
        style={{ color: "#fafaf9", fontFamily: "inherit" }}
      >
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5" style={{ color: "#3f3f46" }}>{subtitle}</p>
    </div>
  );

  const sidebar_footer = (
    <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div
        className="rounded-xl px-3 py-2.5 text-xs"
        style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.12)" }}
      >
        <div className="font-semibold" style={{ color: "#d97706" }}>POS · Inventario · Dashboard</div>
        <p className="mt-0.5" style={{ color: "#52525b" }}>Faltantes · Clientes · Análisis</p>
      </div>
    </div>
  );

  return (
    <>
      {/* xl+: static sidebar */}
      <aside
        className="hidden xl:flex xl:w-64 shrink-0 flex-col"
        style={{ borderRight: "1px solid rgba(255,255,255,0.05)", background: "#111114" }}
      >
        {sidebar_header}
        <NavItems items={navigation_items} />
        {sidebar_footer}
      </aside>

      {/* <xl: hamburger */}
      <button
        type="button"
        onClick={() => set_open(true)}
        aria-label="Abrir menú"
        className="fixed left-0 top-0 z-50 flex h-14 w-14 items-center justify-center transition xl:hidden"
        style={{ color: "#71717a" }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* <xl: backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 xl:hidden"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => set_open(false)}
        />
      )}

      {/* <xl: slide-in drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col shadow-2xl transition-transform duration-200 xl:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#111114", borderRight: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="text-xs font-semibold" style={{ color: "#71717a" }}>Navegación</span>
          </div>
          <button
            type="button"
            onClick={() => set_open(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 transition"
            style={{ color: "#71717a" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <NavItems items={navigation_items} on_click={() => set_open(false)} />
        {sidebar_footer}
      </aside>
    </>
  );
}
