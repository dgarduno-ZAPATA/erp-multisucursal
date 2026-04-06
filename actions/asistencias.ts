"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { get_current_db_user, get_shift_assignable_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";

type AttendanceUserRole = "admin" | "gerente" | "vendedor" | "cajero";

type AttendanceBranchOption = {
  id: number;
  nombre: string;
  codigo: string;
};

type AttendanceOperatorOption = {
  id: string;
  nombre: string;
  rol: AttendanceUserRole;
  sucursal: {
    nombre: string;
  } | null;
};

type AttendanceRecord = {
  id: number;
  fecha_operativa: Date;
  hora_entrada: Date;
  hora_salida: Date | null;
  estado: string;
  usuario: {
    id: string;
    nombre: string;
    rol: AttendanceUserRole;
  };
  sucursal: {
    id: number;
    nombre: string;
  };
};

function get_operating_day(date = new Date()) {
  const operating_day = new Date(date);
  operating_day.setHours(0, 0, 0, 0);
  return operating_day;
}

function end_of_operating_day(date = new Date()) {
  const operating_day = new Date(date);
  operating_day.setHours(23, 59, 59, 999);
  return operating_day;
}

function parse_day(value: string | undefined, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function getAttendanceReport(filters: {
  fecha_desde?: string;
  fecha_hasta?: string;
  sucursal_id?: number;
  vendedor_id?: string;
} = {}) {
  const db_user = await require_roles(["admin", "gerente"]);
  const sucursales: AttendanceBranchOption[] =
    db_user.rol === "admin"
      ? await prisma.sucursal.findMany({
          where: { activo: true },
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, codigo: true },
        })
      : db_user.sucursal_id
        ? await prisma.sucursal.findMany({
            where: { id: db_user.sucursal_id, activo: true },
            select: { id: true, nombre: true, codigo: true },
          })
        : [];
  const branch_ids = sucursales.map((branch) => branch.id);
  const selected_branch_id =
    filters.sucursal_id && branch_ids.includes(filters.sucursal_id) ? filters.sucursal_id : undefined;
  const fecha_desde = parse_day(filters.fecha_desde, get_operating_day(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const fecha_hasta = end_of_operating_day(parse_day(filters.fecha_hasta, get_operating_day()));
  const late_minutes_threshold = 10;
  const expected_hour = 9;
  const expected_minute = 0;

  const operadores: AttendanceOperatorOption[] = await prisma.usuario.findMany({
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
      sucursal: { select: { nombre: true } },
    },
  });

  const selected_operator_id =
    filters.vendedor_id && operadores.some((operador) => operador.id === filters.vendedor_id)
      ? filters.vendedor_id
      : undefined;

  const rows: AttendanceRecord[] = await prisma.asistenciaVendedor.findMany({
    where: {
      ...(selected_branch_id
        ? { sucursal_id: selected_branch_id }
        : branch_ids.length > 0
          ? { sucursal_id: { in: branch_ids } }
          : {}),
      ...(selected_operator_id ? { usuario_id: selected_operator_id } : {}),
      fecha_operativa: { gte: get_operating_day(fecha_desde), lte: get_operating_day(fecha_hasta) },
    },
    orderBy: [{ fecha_operativa: "desc" }, { hora_entrada: "desc" }],
    select: {
      id: true,
      fecha_operativa: true,
      hora_entrada: true,
      hora_salida: true,
      estado: true,
      usuario: {
        select: {
          id: true,
          nombre: true,
          rol: true,
        },
      },
      sucursal: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  const attendance_rows = rows.map((row) => {
    const expected = new Date(row.fecha_operativa);
    expected.setHours(expected_hour, expected_minute, 0, 0);
    const salida = row.hora_salida ?? row.hora_entrada;
    const worked_hours = Math.max(0, Number(((salida.getTime() - row.hora_entrada.getTime()) / 36e5).toFixed(2)));
    const late_minutes = Math.max(0, Math.round((row.hora_entrada.getTime() - expected.getTime()) / 60000));
    return {
      id: row.id,
      fecha_operativa: row.fecha_operativa.toISOString().slice(0, 10),
      hora_entrada: row.hora_entrada.toISOString(),
      hora_salida: row.hora_salida?.toISOString() ?? null,
      estado: row.estado,
      usuario_id: row.usuario.id,
      usuario_nombre: row.usuario.nombre,
      usuario_rol: row.usuario.rol,
      sucursal_id: row.sucursal.id,
      sucursal_nombre: row.sucursal.nombre,
      horas_trabajadas: worked_hours,
      minutos_retardo: late_minutes,
      llego_tarde: late_minutes > late_minutes_threshold,
    };
  });

  const summary_map = new Map<string, {
    usuario_id: string;
    nombre: string;
    rol: "cajero" | "vendedor";
    sucursal: string;
    asistencias: number;
    horas: number;
    retardos: number;
  }>();

  for (const row of attendance_rows) {
    const current = summary_map.get(row.usuario_id) ?? {
      usuario_id: row.usuario_id,
      nombre: row.usuario_nombre,
      rol: row.usuario_rol as "cajero" | "vendedor",
      sucursal: row.sucursal_nombre,
      asistencias: 0,
      horas: 0,
      retardos: 0,
    };
    current.asistencias += 1;
    current.horas += row.horas_trabajadas;
    current.retardos += row.llego_tarde ? 1 : 0;
    summary_map.set(row.usuario_id, current);
  }

  return {
    filtros: {
      fecha_desde: fecha_desde.toISOString().slice(0, 10),
      fecha_hasta: fecha_hasta.toISOString().slice(0, 10),
      sucursal_id: selected_branch_id ?? null,
      vendedor_id: selected_operator_id ?? null,
    },
    catalogos: {
      sucursales,
      operadores: operadores.map((operador) => ({
        id: operador.id,
        nombre: operador.nombre,
        rol: operador.rol,
        sucursal: operador.sucursal?.nombre ?? "Sin sucursal base",
      })),
    },
    resumen: Array.from(summary_map.values())
      .map((item) => ({
        ...item,
        horas: Number(item.horas.toFixed(2)),
      }))
      .sort((a, b) => b.horas - a.horas),
    rows: attendance_rows,
    reglas: {
      hora_esperada: "09:00",
      tolerancia_minutos: late_minutes_threshold,
    },
  };
}

export async function registrarEntradaSucursal(sucursal_id: number) {
  const db_user = await get_current_db_user();

  if (!db_user) {
    return { success: false as const, error: "Sesion requerida." };
  }

  if (db_user.rol !== "vendedor" && db_user.rol !== "cajero") {
    return { success: false as const, error: "Solo vendedores o cajeros registran sucursal operativa diaria." };
  }

  if (!Number.isInteger(sucursal_id) || sucursal_id <= 0) {
    return { success: false as const, error: "Sucursal invalida." };
  }

  const { sucursales } = await get_shift_assignable_sucursales();
  const sucursal = sucursales.find((item) => item.id === sucursal_id);

  if (!sucursal) {
    return { success: false as const, error: "La sucursal seleccionada no esta disponible." };
  }

  const fecha_operativa = get_operating_day();
  const asistencia_existente = await prisma.asistenciaVendedor.findUnique({
    where: {
      usuario_id_fecha_operativa: {
        usuario_id: db_user.id,
        fecha_operativa,
      },
    },
    select: {
      id: true,
      sucursal_id: true,
      estado: true,
      sucursal: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (asistencia_existente) {
    if (asistencia_existente.sucursal_id === sucursal_id) {
      return { success: true as const };
    }

    return {
      success: false as const,
      error: `Ya registraste entrada hoy en ${asistencia_existente.sucursal.nombre}.`,
    };
  }

  await prisma.asistenciaVendedor.create({
    data: {
      usuario_id: db_user.id,
      sucursal_id,
      fecha_operativa,
      hora_entrada: new Date(),
      estado: "activa",
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");
  revalidatePath("/faltantes");

  return { success: true as const };
}

export async function cerrarTurnoOperativo() {
  const db_user = await get_current_db_user();

  if (!db_user) {
    return { success: false as const, error: "Sesion requerida." };
  }

  if (db_user.rol !== "vendedor" && db_user.rol !== "cajero") {
    return { success: false as const, error: "Solo vendedores o cajeros pueden cerrar turno desde este flujo." };
  }

  const fecha_operativa = get_operating_day();
  const asistencia = await prisma.asistenciaVendedor.findUnique({
    where: {
      usuario_id_fecha_operativa: {
        usuario_id: db_user.id,
        fecha_operativa,
      },
    },
    select: {
      id: true,
      estado: true,
    },
  });

  if (!asistencia) {
    return { success: false as const, error: "No hay asistencia activa para hoy." };
  }

  if (asistencia.estado === "cerrada") {
    return { success: true as const };
  }

  await prisma.asistenciaVendedor.update({
    where: { id: asistencia.id },
    data: {
      estado: "cerrada",
      hora_salida: new Date(),
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");

  return { success: true as const };
}
