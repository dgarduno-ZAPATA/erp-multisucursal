export type AppEnvironment = "development" | "sandbox" | "production";

function normalize_environment(value: string | undefined): AppEnvironment {
  if (value === "sandbox" || value === "production" || value === "development") {
    return value;
  }

  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function resolve_app_url(value: string | undefined) {
  if (!value) return "http://localhost:3000";
  return value.trim();
}

export const app_environment = normalize_environment(process.env.NEXT_PUBLIC_APP_ENV);
export const is_production_environment = app_environment === "production";
export const is_sandbox_environment = app_environment === "sandbox";
export const is_development_environment = app_environment === "development";
export const sandbox_label =
  process.env.NEXT_PUBLIC_SANDBOX_LABEL?.trim() ||
  (is_sandbox_environment ? "Sandbox" : is_development_environment ? "Local" : "");
export const app_url = resolve_app_url(process.env.NEXT_PUBLIC_APP_URL);
export const pwa_enabled =
  process.env.NEXT_PUBLIC_ENABLE_PWA === "true" ||
  (process.env.NEXT_PUBLIC_ENABLE_PWA == null && is_production_environment);
