import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import { SwRegister } from "@/components/sw-register";
import { app_environment, app_url, is_production_environment } from "@/lib/config/app-env";

import "./globals.css";

let metadata_base: URL | undefined;
try {
  metadata_base = new URL(app_url);
} catch {
  metadata_base = undefined;
}

export const metadata: Metadata = {
  metadataBase: metadata_base,
  title:
    app_environment === "sandbox"
      ? "ERP Multi-Sucursal | Sandbox"
      : app_environment === "development"
        ? "ERP Multi-Sucursal | Local"
        : "ERP Multi-Sucursal",
  description:
    app_environment === "sandbox"
      ? "Sandbox interno del ERP/CRM Multi-Sucursal para validacion operativa."
      : "MVP ERP/CRM Multi-Sucursal",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" }],
    shortcut: ["/icons/icon-96x96.png"],
  },
  robots: {
    index: is_production_environment,
    follow: is_production_environment,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <SwRegister />
      </body>
    </html>
  );
}
