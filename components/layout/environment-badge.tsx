import { app_environment, sandbox_label } from "@/lib/config/app-env";

const tones: Record<"development" | "sandbox" | "production", string> = {
  development: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  sandbox: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  production: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

type EnvironmentBadgeProps = {
  compact?: boolean;
};

export function EnvironmentBadge({ compact = false }: EnvironmentBadgeProps) {
  if (app_environment === "production" && !sandbox_label) {
    return null;
  }

  const label = sandbox_label || app_environment;

  return (
    <span
      className={`inline-flex items-center rounded-full border py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${compact ? "px-2.5" : "px-3"} ${tones[app_environment]}`}
    >
      {label}
    </span>
  );
}
