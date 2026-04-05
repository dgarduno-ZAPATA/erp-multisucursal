import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type NavigationItem = {
  href: string;
  label: string;
  description: string;
};

type AppShellProps = {
  children: ReactNode;
  title: string;
  description: string;
  sidebar_title: string;
  sidebar_subtitle: string;
  branch_name: string;
  user_name: string;
  user_rol?: string;
  navigation: NavigationItem[];
};

export function AppShell({
  children,
  title,
  description,
  sidebar_title,
  sidebar_subtitle,
  branch_name,
  user_name,
  user_rol,
  navigation,
}: AppShellProps) {
  return (
    <div
      className="min-h-screen text-slate-100"
      style={{ background: "#0c0c0e", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <Sidebar
          items={navigation}
          title={sidebar_title}
          subtitle={sidebar_subtitle}
        />
        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <Topbar
            title={title}
            description={description}
            branch_name={branch_name}
            user_name={user_name}
            user_rol={user_rol}
          />
          <main className="flex-1 px-5 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
