"use server";

import { revalidatePath } from "next/cache";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

type SalesGoalFilters = {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: number;
  vendedor_id?: string;
};

function parse_day(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function end_of_day(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function start_of_day(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function start_of_week(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function decimal_to_number(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function get_goal_cadence(fecha_inicio: Date, fecha_fin: Date) {
  const ms_per_day = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.round((end_of_day(fecha_fin).getTime() - fecha_inicio.getTime()) / ms_per_day) + 1);
  if (days <= 8) return "semanal" as const;
  if (days <= 35) return "mensual" as const;
  return "personalizada" as const;
}

function get_goal_status(porcentaje: number) {
  if (porcentaje >= 100) return "cumplida" as const;
  if (porcentaje >= 75) return "en_riesgo_bajo" as const;
  if (porcentaje >= 40) return "en_riesgo_medio" as const;
  return "critica" as const;
}

function compare_pct(current: number, previous: number) {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function createMetaVenta(form_data: FormData) {
  await require_roles(["admin", "gerente"]);
  const { sucursales } = await get_accessible_sucursales();
  const branch_ids = sucursales.map((branch) => branch.id);

  const nombre = String(form_data.get("nombre") ?? "").trim();
  const tipo = String(form_data.get("tipo") ?? "").trim();
  const fecha_inicio = String(form_data.get("fecha_inicio") ?? "").trim();
  const fecha_fin = String(form_data.get("fecha_fin") ?? "").trim();
  const monto_raw = Number(form_data.get("monto_objetivo") ?? 0);
  const sucursal_id_value = String(form_data.get("sucursal_id") ?? "").trim();
  const usuario_id = String(form_data.get("usuario_id") ?? "").trim() || null;
  const sucursal_id = sucursal_id_value ? Number(sucursal_id_value) : null;

  if (!fecha_inicio || !fecha_fin) {
    return { success: false as const, error: "Define el rango de fechas de la meta." };
  }

  const start = parse_day(fecha_inicio, new Date());
  const end = parse_day(fecha_fin, new Date());
  if (start > end) {
    return { success: false as const, error: "La fecha inicial no puede ser mayor que la final." };
  }

  if (!Number.isFinite(monto_raw) || monto_raw <= 0) {
    return { success: false as const, error: "El monto objetivo debe ser mayor a cero." };
  }

  if (tipo !== "sucursal" && tipo !== "vendedor") {
    return { success: false as const, error: "Selecciona un tipo de meta valido." };
  }

  if (tipo === "sucursal") {
    if (!sucursal_id || !branch_ids.includes(sucursal_id)) {
      return { success: false as const, error: "Selecciona una sucursal valida para la meta." };
    }
  }

  if (tipo === "vendedor") {
    if (!usuario_id) {
      return { success: false as const, error: "Selecciona un vendedor o cajero para la meta." };
    }

    const operador = await prisma.usuario.findFirst({
      where: {
        id: usuario_id,
        activo: true,
        rol: { in: ["cajero", "vendedor"] },
        ...(branch_ids.length > 0 ? { sucursal_id: { in: branch_ids } } : {}),
      },
      select: { id: true },
    });

    if (!operador) {
      return { success: false as const, error: "Ese operador no esta dentro de tu alcance." };
    }
  }

  await prisma.metaVenta.create({
    data: {
      nombre: nombre || null,
      usuario_id: tipo === "vendedor" ? usuario_id : null,
      sucursal_id: tipo === "sucursal" ? sucursal_id : null,
      fecha_inicio: start,
      fecha_fin: end,
      monto_objetivo: monto_raw,
      activa: true,
    },
  });

  revalidatePath("/dashboard");

  return { success: true as const };
}

export async function getSalesGoalsSummary(filters: SalesGoalFilters = {}) {
  await require_roles(["admin", "gerente"]);

  const now = new Date();
  const { sucursales } = await get_accessible_sucursales();
  const branch_ids = sucursales.map((branch) => branch.id);
  const default_from = start_of_week(now);
  const default_to = end_of_day(now);
  const fecha_desde = parse_day(filters.fecha_desde, default_from);
  const fecha_hasta = end_of_day(parse_day(filters.fecha_hasta, default_to));
  const period_length_days =
    Math.max(1, Math.round((fecha_hasta.getTime() - fecha_desde.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const previous_fecha_hasta = new Date(fecha_desde.getTime() - 1);
  const previous_fecha_desde = start_of_day(
    new Date(fecha_desde.getTime() - period_length_days * 24 * 60 * 60 * 1000),
  );
  const selected_branch_id =
    filters.sucursal_id && branch_ids.includes(filters.sucursal_id) ? filters.sucursal_id : undefined;

  const operadores = await prisma.usuario.findMany({
    where: {
      activo: true,
      rol: { in: ["cajero", "vendedor"] },
      ...(branch_ids.length > 0 ? { sucursal_id: { in: branch_ids } } : {}),
    },
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      rol: true,
      sucursal_id: true,
      sucursal: { select: { nombre: true } },
    },
  });

  const operator_ids = operadores.map((operator) => operator.id);
  const selected_operator_id =
    filters.vendedor_id && operator_ids.includes(filters.vendedor_id) ? filters.vendedor_id : undefined;

  const metas = await prisma.metaVenta.findMany({
    where: {
      activa: true,
      fecha_inicio: { lte: fecha_hasta },
      fecha_fin: { gte: fecha_desde },
      OR: [
        selected_branch_id ? { sucursal_id: selected_branch_id } : { sucursal_id: { in: branch_ids } },
        selected_operator_id
          ? { usuario_id: selected_operator_id }
          : operator_ids.length > 0
            ? { usuario_id: { in: operator_ids } }
            : { id: -1 },
      ],
    },
    orderBy: [{ fecha_fin: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      nombre: true,
      usuario_id: true,
      sucursal_id: true,
      fecha_inicio: true,
      fecha_fin: true,
      monto_objetivo: true,
      usuario: {
        select: {
          nombre: true,
          rol: true,
        },
      },
      sucursal: {
        select: {
          nombre: true,
        },
      },
    },
  });

  const rows = await Promise.all(
    metas.map(async (meta) => {
      const total = await prisma.venta.aggregate({
        where: {
          estado: "completada",
          ...(meta.sucursal_id ? { sucursal_id: meta.sucursal_id } : {}),
          ...(meta.usuario_id ? { usuario_id: meta.usuario_id } : {}),
          fecha_venta: {
            gte: meta.fecha_inicio,
            lte: end_of_day(meta.fecha_fin),
          },
        },
        _sum: { total: true },
        _count: { id: true },
      });

      const objetivo = decimal_to_number(meta.monto_objetivo);
      const alcanzado = decimal_to_number(total._sum.total);
      const porcentaje = objetivo > 0 ? Math.round((alcanzado / objetivo) * 100) : 0;
      const cadence = get_goal_cadence(meta.fecha_inicio, meta.fecha_fin);
      const status = get_goal_status(porcentaje);

      return {
        id: meta.id,
        nombre:
          meta.nombre ||
          (meta.usuario
            ? `Meta de ${meta.usuario.nombre}`
            : meta.sucursal
              ? `Meta de ${meta.sucursal.nombre}`
              : `Meta #${meta.id}`),
        tipo: meta.usuario_id ? ("vendedor" as const) : ("sucursal" as const),
        fecha_inicio: meta.fecha_inicio.toISOString().slice(0, 10),
        fecha_fin: meta.fecha_fin.toISOString().slice(0, 10),
        monto_objetivo: objetivo,
        monto_actual: alcanzado,
        porcentaje,
        tickets: total._count.id,
        cadencia: cadence,
        estatus: status,
        faltante: Math.max(0, objetivo - alcanzado),
        usuario_nombre: meta.usuario?.nombre ?? null,
        usuario_rol: meta.usuario?.rol ?? null,
        sucursal_nombre: meta.sucursal?.nombre ?? null,
      };
    }),
  );

  const resumen = {
    total_objetivo: rows.reduce((sum, row) => sum + row.monto_objetivo, 0),
    total_actual: rows.reduce((sum, row) => sum + row.monto_actual, 0),
    metas_activas: rows.length,
    metas_cumplidas: rows.filter((row) => row.monto_actual >= row.monto_objetivo).length,
    metas_semanales: rows.filter((row) => row.cadencia === "semanal").length,
    metas_mensuales: rows.filter((row) => row.cadencia === "mensual").length,
    criticas: rows.filter((row) => row.estatus === "critica").length,
    cumplimiento_promedio:
      rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.porcentaje, 0) / rows.length) : 0,
  };

  const previous_metas = await prisma.metaVenta.findMany({
    where: {
      activa: true,
      fecha_inicio: { lte: previous_fecha_hasta },
      fecha_fin: { gte: previous_fecha_desde },
      OR: [
        selected_branch_id ? { sucursal_id: selected_branch_id } : { sucursal_id: { in: branch_ids } },
        selected_operator_id
          ? { usuario_id: selected_operator_id }
          : operator_ids.length > 0
            ? { usuario_id: { in: operator_ids } }
            : { id: -1 },
      ],
    },
    select: {
      id: true,
      usuario_id: true,
      sucursal_id: true,
      fecha_inicio: true,
      fecha_fin: true,
      monto_objetivo: true,
    },
  });

  const previous_rows = await Promise.all(
    previous_metas.map(async (meta) => {
      const total = await prisma.venta.aggregate({
        where: {
          estado: "completada",
          ...(meta.sucursal_id ? { sucursal_id: meta.sucursal_id } : {}),
          ...(meta.usuario_id ? { usuario_id: meta.usuario_id } : {}),
          fecha_venta: {
            gte: meta.fecha_inicio,
            lte: end_of_day(meta.fecha_fin),
          },
        },
        _sum: { total: true },
      });

      const objetivo = decimal_to_number(meta.monto_objetivo);
      const alcanzado = decimal_to_number(total._sum.total);
      const porcentaje = objetivo > 0 ? Math.round((alcanzado / objetivo) * 100) : 0;

      return {
        monto_objetivo: objetivo,
        monto_actual: alcanzado,
        porcentaje,
      };
    }),
  );

  const resumen_anterior = {
    total_objetivo: previous_rows.reduce((sum, row) => sum + row.monto_objetivo, 0),
    total_actual: previous_rows.reduce((sum, row) => sum + row.monto_actual, 0),
    metas_activas: previous_rows.length,
    cumplimiento_promedio:
      previous_rows.length > 0
        ? Math.round(previous_rows.reduce((sum, row) => sum + row.porcentaje, 0) / previous_rows.length)
        : 0,
    metas_cumplidas: previous_rows.filter((row) => row.porcentaje >= 100).length,
  };

  return {
    filtros: {
      fecha_desde: fecha_desde.toISOString().slice(0, 10),
      fecha_hasta: fecha_hasta.toISOString().slice(0, 10),
      sucursal_id: selected_branch_id ?? null,
      vendedor_id: selected_operator_id ?? null,
    },
    catalogos: {
      sucursales,
      operadores: operadores.map((operator) => ({
        id: operator.id,
        nombre: operator.nombre,
        rol: operator.rol,
        sucursal: operator.sucursal?.nombre ?? "Sin sucursal base",
      })),
    },
    resumen,
    comparativo: {
      periodo_anterior: {
        fecha_desde: previous_fecha_desde.toISOString().slice(0, 10),
        fecha_hasta: previous_fecha_hasta.toISOString().slice(0, 10),
      },
      resumen_anterior,
      delta_cumplimiento: compare_pct(resumen.cumplimiento_promedio, resumen_anterior.cumplimiento_promedio),
      delta_monto_actual: compare_pct(resumen.total_actual, resumen_anterior.total_actual),
      delta_metas_cumplidas: compare_pct(resumen.metas_cumplidas, resumen_anterior.metas_cumplidas),
    },
    metas: rows.sort((a, b) => b.porcentaje - a.porcentaje).slice(0, 12),
    ranking: rows
      .slice()
      .sort((a, b) => {
        if (b.porcentaje !== a.porcentaje) return b.porcentaje - a.porcentaje;
        return b.monto_actual - a.monto_actual;
      })
      .slice(0, 5),
  };
}
