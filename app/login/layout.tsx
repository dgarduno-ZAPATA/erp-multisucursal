import { Syne, DM_Sans } from "next/font/google";
import type { ReactNode } from "react";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const dm_sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm",
  weight: ["300", "400", "500"],
  display: "swap",
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${syne.variable} ${dm_sans.variable}`} style={{ fontFamily: "var(--font-dm), system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
