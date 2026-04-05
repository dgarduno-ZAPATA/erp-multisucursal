import { prisma } from "@/lib/db/prisma";
import {
  app_environment,
  is_production_environment,
  pwa_enabled,
  sandbox_label,
} from "@/lib/config/app-env";

export async function GET() {
  const started_at = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        ok: true,
        environment: app_environment,
        sandbox_label: sandbox_label || null,
        pwa_enabled,
        indexed: is_production_environment,
        database: "up",
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - started_at,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        environment: app_environment,
        database: "down",
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - started_at,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
