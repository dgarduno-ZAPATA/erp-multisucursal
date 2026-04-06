import { prisma } from "@/lib/db/prisma";
import {
  app_environment,
  app_url,
  is_production_environment,
  pwa_enabled,
} from "@/lib/config/app-env";

export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warn" | "fail";

type ReadinessCheck = {
  name: string;
  status: CheckStatus;
  message: string;
};

function evaluate_env(name: string, value: string | undefined): ReadinessCheck {
  return value && value.trim().length > 0
    ? {
        name,
        status: "pass",
        message: "Variable presente.",
      }
    : {
        name,
        status: "fail",
        message: "Variable faltante.",
      };
}

function get_score(checks: ReadinessCheck[]) {
  const total = checks.length || 1;
  const weighted = checks.reduce((sum, check) => {
    if (check.status === "pass") return sum + 1;
    if (check.status === "warn") return sum + 0.5;
    return sum;
  }, 0);

  return Math.round((weighted / total) * 100);
}

export async function GET() {
  const checks: ReadinessCheck[] = [];

  checks.push(evaluate_env("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL));
  checks.push(evaluate_env("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
  checks.push(evaluate_env("DATABASE_URL", process.env.DATABASE_URL));
  checks.push(evaluate_env("DIRECT_URL", process.env.DIRECT_URL));
  checks.push(evaluate_env("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL));
  checks.push(evaluate_env("NEXT_PUBLIC_APP_ENV", process.env.NEXT_PUBLIC_APP_ENV));

  checks.push({
    name: "app_environment",
    status: app_environment === "sandbox" ? "pass" : app_environment === "production" ? "warn" : "warn",
    message:
      app_environment === "sandbox"
        ? "Entorno configurado como sandbox."
        : app_environment === "production"
          ? "La app esta marcada como production; para piloto controlado conviene sandbox."
          : "La app no esta marcada como sandbox; revisa NEXT_PUBLIC_APP_ENV.",
  });

  checks.push({
    name: "pwa_mode",
    status:
      app_environment === "sandbox" && pwa_enabled
        ? "warn"
        : !pwa_enabled
          ? "pass"
          : "pass",
    message:
      app_environment === "sandbox" && pwa_enabled
        ? "PWA esta activa en sandbox; puede causar problemas de cache durante pruebas."
        : pwa_enabled
          ? "PWA activa."
          : "PWA desactivada para un despliegue mas estable.",
  });

  let parsed_app_url_ok = false;
  try {
    const parsed = new URL(app_url);
    parsed_app_url_ok = parsed.protocol === "https:" || parsed.hostname === "localhost";
  } catch {
    parsed_app_url_ok = false;
  }

  checks.push({
    name: "app_url_format",
    status: parsed_app_url_ok ? "pass" : "fail",
    message: parsed_app_url_ok
      ? "APP URL valida."
      : "NEXT_PUBLIC_APP_URL no tiene un formato valido.",
  });

  checks.push({
    name: "indexing",
    status: is_production_environment ? "warn" : "pass",
    message: is_production_environment
      ? "El entorno puede indexarse; para sandbox normalmente se recomienda noindex."
      : "El entorno no esta pensado para indexacion publica.",
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({
      name: "database_connection",
      status: "pass",
      message: "Conexion a base de datos correcta.",
    });
  } catch (error) {
    checks.push({
      name: "database_connection",
      status: "fail",
      message: error instanceof Error ? error.message : "No fue posible conectar a la base.",
    });
  }

  const score = get_score(checks);
  const ready = checks.every((check) => check.status !== "fail");
  const actions = checks
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.name}: ${check.message}`);

  return Response.json(
    {
      ok: ready,
      score,
      environment: app_environment,
      app_url,
      pwa_enabled,
      ready_for_sandbox: ready,
      checks,
      recommended_actions: actions,
      timestamp: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
