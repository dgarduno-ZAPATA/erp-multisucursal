import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import { get_current_user } from "@/lib/auth/session";

function get_operating_day(date = new Date()) {
  const operating_day = new Date(date);
  operating_day.setHours(0, 0, 0, 0);
  return operating_day;
}

export const get_current_db_user = cache(async () => {
  const auth_user = await get_current_user();
  if (!auth_user) return null;

  return prisma.usuario.findUnique({
    where: { id: auth_user.id },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      sucursal_id: true,
      sucursal: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          activo: true,
        },
      },
    },
  });
});

export async function get_user_operating_assignment(user_id: string) {
  const operating_day = get_operating_day();
  const db_user = await prisma.usuario.findUnique({
    where: { id: user_id },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      sucursal_id: true,
      sucursal: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          activo: true,
        },
      },
    },
  });

  if (!db_user) return null;

  if (db_user.rol === "vendedor" || db_user.rol === "cajero") {
    const asistencia = await prisma.asistenciaVendedor.findUnique({
      where: {
        usuario_id_fecha_operativa: {
          usuario_id: db_user.id,
          fecha_operativa: operating_day,
        },
      },
      select: {
        id: true,
        estado: true,
        hora_entrada: true,
        hora_salida: true,
        sucursal_id: true,
        sucursal: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            activo: true,
          },
        },
      },
    });

    if (asistencia?.sucursal.activo) {
      return {
        source: "attendance" as const,
        usuario: db_user,
        sucursal_id: asistencia.sucursal_id,
        sucursal: asistencia.sucursal,
        asistencia,
      };
    }
  }

  if (db_user.sucursal?.activo) {
    return {
      source: "profile" as const,
      usuario: db_user,
      sucursal_id: db_user.sucursal.id,
      sucursal: db_user.sucursal,
      asistencia: null,
    };
  }

  return {
    source: "none" as const,
    usuario: db_user,
    sucursal_id: null,
    sucursal: null,
    asistencia: null,
  };
}

export const get_current_operating_assignment = cache(async () => {
  const auth_user = await get_current_user();
  if (!auth_user) return null;
  return get_user_operating_assignment(auth_user.id);
});

export const get_accessible_sucursales = cache(async () => {
  const db_user = await get_current_db_user();
  if (!db_user) {
    return { db_user: null, sucursales: [] };
  }

  if (db_user.rol === "admin") {
    const sucursales = await prisma.sucursal.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, codigo: true },
    });
    return { db_user, sucursales };
  }

  if (!db_user.sucursal || !db_user.sucursal.activo) {
    return { db_user, sucursales: [] };
  }

  return {
    db_user,
    sucursales: [
      {
        id: db_user.sucursal.id,
        nombre: db_user.sucursal.nombre,
        codigo: db_user.sucursal.codigo,
      },
    ],
  };
});

export const get_shift_assignable_sucursales = cache(async () => {
  const db_user = await get_current_db_user();
  if (!db_user) return { db_user: null, sucursales: [] };

  if (db_user.rol === "vendedor" || db_user.rol === "cajero") {
    const sucursales = await prisma.sucursal.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, codigo: true },
    });
    return { db_user, sucursales };
  }

  return get_accessible_sucursales();
});

export async function can_access_sucursal(sucursal_id: number) {
  const { db_user, sucursales } = await get_accessible_sucursales();
  if (!db_user) return false;
  return sucursales.some((sucursal) => sucursal.id === sucursal_id);
}
