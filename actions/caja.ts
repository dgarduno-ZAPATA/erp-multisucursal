"use server";

import { revalidatePath } from "next/cache";

import { get_current_db_user, get_current_operating_assignment } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";

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

function decimal_to_number(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

async function get_cashbox_context() {
  const db_user = await get_current_db_user();
  const operating_assignment = await get_current_operating_assignment();

  if (!db_user) {
    return { ok: false as const, error: "Sesion requerida." };
  }

  if (db_user.rol !== "vendedor" && db_user.rol !== "cajero") {
    return { ok: false as const, error: "Solo vendedor o cajero pueden operar caja." };
  }

  if (!operating_assignment?.sucursal_id) {
    return { ok: false as const, error: "Primero registra tu sucursal operativa del dia." };
  }

  return {
    ok: true as const,
    db_user,
    operating_assignment,
    fecha_operativa: get_operating_day(),
  };
}

function sanitize_notes(value: string | undefined) {
  const notes = value?.trim();
  return notes ? notes.slice(0, 600) : null;
}

export async function abrirCaja(monto_inicial_input: number, observaciones_input?: string) {
  const context = await get_cashbox_context();
  if (!context.ok) return { success: false as const, error: context.error };

  const monto_inicial = Number(monto_inicial_input);
  if (!Number.isFinite(monto_inicial) || monto_inicial < 0) {
    return { success: false as const, error: "El monto inicial debe ser un numero valido." };
  }

  const caja_existente = await prisma.cierreCaja.findUnique({
    where: {
      usuario_id_fecha_operativa: {
        usuario_id: context.db_user.id,
        fecha_operativa: context.fecha_operativa,
      },
    },
    select: {
      id: true,
      estado: true,
    },
  });

  if (caja_existente?.estado === "abierta") {
    return { success: false as const, error: "Ya tienes una caja abierta hoy." };
  }

  if (caja_existente?.estado === "cerrada") {
    return { success: false as const, error: "La caja de hoy ya fue cerrada." };
  }

  await prisma.cierreCaja.create({
    data: {
      usuario_id: context.db_user.id,
      sucursal_id: context.operating_assignment.sucursal_id,
      fecha_operativa: context.fecha_operativa,
      hora_apertura: new Date(),
      monto_inicial,
      observaciones_apertura: sanitize_notes(observaciones_input),
      estado: "abierta",
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");

  return { success: true as const };
}

export async function cerrarCaja(monto_final_input: number, observaciones_input?: string) {
  const context = await get_cashbox_context();
  if (!context.ok) return { success: false as const, error: context.error };

  const monto_final_declarado = Number(monto_final_input);
  if (!Number.isFinite(monto_final_declarado) || monto_final_declarado < 0) {
    return { success: false as const, error: "El monto final debe ser un numero valido." };
  }

  const caja = await prisma.cierreCaja.findUnique({
    where: {
      usuario_id_fecha_operativa: {
        usuario_id: context.db_user.id,
        fecha_operativa: context.fecha_operativa,
      },
    },
    select: {
      id: true,
      estado: true,
      monto_inicial: true,
    },
  });

  if (!caja) {
    return { success: false as const, error: "No hay una caja abierta para hoy." };
  }

  if (caja.estado === "cerrada") {
    return { success: false as const, error: "La caja de hoy ya fue cerrada." };
  }

  const ventas = await prisma.venta.groupBy({
    by: ["metodo_pago"],
    where: {
      usuario_id: context.db_user.id,
      sucursal_id: context.operating_assignment.sucursal_id,
      estado: "completada",
      fecha_venta: {
        gte: context.fecha_operativa,
        lte: end_of_operating_day(context.fecha_operativa),
      },
    },
    _sum: { total: true },
  });

  const totals = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  };

  for (const row of ventas) {
    totals[row.metodo_pago] = decimal_to_number(row._sum.total);
  }

  const monto_esperado = decimal_to_number(caja.monto_inicial) + totals.efectivo;
  const diferencia = monto_final_declarado - monto_esperado;

  await prisma.cierreCaja.update({
    where: { id: caja.id },
    data: {
      hora_cierre: new Date(),
      ventas_efectivo: totals.efectivo,
      ventas_tarjeta: totals.tarjeta,
      ventas_transferencia: totals.transferencia,
      monto_esperado,
      monto_final_declarado,
      diferencia,
      observaciones_cierre: sanitize_notes(observaciones_input),
      estado: "cerrada",
    },
  });

  revalidatePath("/pos");
  revalidatePath("/dashboard");

  return { success: true as const };
}
