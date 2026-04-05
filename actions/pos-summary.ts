"use server";

import { get_current_db_user, get_current_operating_assignment } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";

function start_of_day(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function end_of_day(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
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

type ArqueoStatus = "cuadrada" | "sobrante" | "faltante";

export async function getPosLandingSummary() {
  const db_user = await get_current_db_user();
  const operating_assignment = await get_current_operating_assignment();

  if (!db_user) return null;
  if (db_user.rol !== "vendedor" && db_user.rol !== "cajero") return null;

  const now = new Date();
  const today_from = start_of_day(now);
  const today_to = end_of_day(now);
  const week_from = start_of_week(now);

  const [today_sales, week_sales, today_shortages, cashbox, active_goals, today_sales_by_payment] = await Promise.all([
    prisma.venta.aggregate({
      where: {
        usuario_id: db_user.id,
        estado: "completada",
        fecha_venta: { gte: today_from, lte: today_to },
      },
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
    prisma.venta.aggregate({
      where: {
        usuario_id: db_user.id,
        estado: "completada",
        fecha_venta: { gte: week_from, lte: today_to },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.faltante.count({
      where: {
        usuario_id: db_user.id,
        created_at: { gte: today_from, lte: today_to },
      },
    }),
    prisma.cierreCaja.findUnique({
      where: {
        usuario_id_fecha_operativa: {
          usuario_id: db_user.id,
          fecha_operativa: today_from,
        },
      },
      select: {
        estado: true,
        monto_inicial: true,
        observaciones_apertura: true,
        ventas_efectivo: true,
        ventas_tarjeta: true,
        ventas_transferencia: true,
        monto_esperado: true,
        monto_final_declarado: true,
        diferencia: true,
        observaciones_cierre: true,
        hora_apertura: true,
        hora_cierre: true,
      },
    }),
    prisma.metaVenta.findMany({
      where: {
        activa: true,
        fecha_inicio: { lte: today_to },
        fecha_fin: { gte: today_from },
        OR: [
          { usuario_id: db_user.id },
          operating_assignment?.sucursal_id ? { sucursal_id: operating_assignment.sucursal_id } : { id: -1 },
        ],
      },
      select: {
        id: true,
        nombre: true,
        usuario_id: true,
        sucursal_id: true,
        monto_objetivo: true,
      },
    }),
    prisma.venta.groupBy({
      by: ["metodo_pago"],
      where: {
        usuario_id: db_user.id,
        ...(operating_assignment?.sucursal_id ? { sucursal_id: operating_assignment.sucursal_id } : {}),
        estado: "completada",
        fecha_venta: { gte: today_from, lte: today_to },
      },
      _sum: { total: true },
    }),
  ]);

  const shift_hours = operating_assignment?.asistencia
    ? Number(
        (
          ((operating_assignment.asistencia.hora_salida ?? now).getTime() -
            operating_assignment.asistencia.hora_entrada.getTime()) /
          (1000 * 60 * 60)
        ).toFixed(2),
      )
    : 0;

  const payment_totals = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  };

  for (const row of today_sales_by_payment) {
    payment_totals[row.metodo_pago] = decimal_to_number(row._sum.total);
  }

  const arqueo_status: ArqueoStatus =
    (cashbox?.diferencia !== null && cashbox?.diferencia !== undefined
      ? decimal_to_number(cashbox.diferencia)
      : 0) === 0
      ? "cuadrada"
      : (cashbox?.diferencia !== null && cashbox?.diferencia !== undefined
          ? decimal_to_number(cashbox.diferencia)
          : 0) > 0
        ? "sobrante"
        : "faltante";

  return {
    operador: {
      id: db_user.id,
      nombre: db_user.nombre,
      rol: db_user.rol,
    },
    sucursal_actual: operating_assignment?.sucursal?.nombre ?? db_user.sucursal?.nombre ?? "Sin sucursal",
    asistencia_activa: Boolean(operating_assignment?.asistencia && !operating_assignment.asistencia.hora_salida),
    hora_entrada: operating_assignment?.asistencia?.hora_entrada.toISOString() ?? null,
    horas_turno: shift_hours,
    ventas_hoy: Number(today_sales._sum.total ?? 0),
    tickets_hoy: today_sales._count.id,
    ticket_promedio_hoy: Number(today_sales._avg.total ?? 0),
    ventas_semana: Number(week_sales._sum.total ?? 0),
    tickets_semana: week_sales._count.id,
    faltantes_hoy: today_shortages,
    caja: cashbox
      ? {
          estado: cashbox.estado,
          monto_inicial: decimal_to_number(cashbox.monto_inicial),
          observaciones_apertura: cashbox.observaciones_apertura,
          ventas_efectivo:
            cashbox.estado === "abierta"
              ? payment_totals.efectivo
              : decimal_to_number(cashbox.ventas_efectivo),
          ventas_tarjeta:
            cashbox.estado === "abierta"
              ? payment_totals.tarjeta
              : decimal_to_number(cashbox.ventas_tarjeta),
          ventas_transferencia:
            cashbox.estado === "abierta"
              ? payment_totals.transferencia
              : decimal_to_number(cashbox.ventas_transferencia),
          monto_esperado:
            cashbox.estado === "abierta"
              ? decimal_to_number(cashbox.monto_inicial) + payment_totals.efectivo
              : cashbox.monto_esperado !== null
                ? decimal_to_number(cashbox.monto_esperado)
                : null,
          monto_final_declarado:
            cashbox.monto_final_declarado !== null ? decimal_to_number(cashbox.monto_final_declarado) : null,
          diferencia: cashbox.diferencia !== null ? decimal_to_number(cashbox.diferencia) : null,
          observaciones_cierre: cashbox.observaciones_cierre,
          hora_apertura: cashbox.hora_apertura.toISOString(),
          hora_cierre: cashbox.hora_cierre?.toISOString() ?? null,
          total_vendido:
            payment_totals.efectivo + payment_totals.tarjeta + payment_totals.transferencia,
          tickets_vendidos: today_sales._count.id,
          arqueo_estatus: arqueo_status,
        }
      : null,
    historial_cierres: (
      await prisma.cierreCaja.findMany({
        where: {
          usuario_id: db_user.id,
        },
        orderBy: [{ fecha_operativa: "desc" }, { hora_apertura: "desc" }],
        take: 5,
        select: {
          id: true,
          fecha_operativa: true,
          estado: true,
          monto_inicial: true,
          monto_esperado: true,
          monto_final_declarado: true,
          diferencia: true,
          hora_apertura: true,
          hora_cierre: true,
          sucursal: { select: { nombre: true } },
        },
      })
    ).map((row) => ({
      id: row.id,
      fecha_operativa: row.fecha_operativa.toISOString().slice(0, 10),
      estado: row.estado,
      sucursal_nombre: row.sucursal.nombre,
      monto_inicial: decimal_to_number(row.monto_inicial),
      monto_esperado: row.monto_esperado !== null ? decimal_to_number(row.monto_esperado) : null,
      monto_final_declarado:
        row.monto_final_declarado !== null ? decimal_to_number(row.monto_final_declarado) : null,
      diferencia: row.diferencia !== null ? decimal_to_number(row.diferencia) : null,
      hora_apertura: row.hora_apertura.toISOString(),
      hora_cierre: row.hora_cierre?.toISOString() ?? null,
    })),
    metas: await Promise.all(
      active_goals.map(async (goal) => {
        const totals = await prisma.venta.aggregate({
          where: {
            estado: "completada",
            ...(goal.usuario_id ? { usuario_id: goal.usuario_id } : {}),
            ...(goal.sucursal_id ? { sucursal_id: goal.sucursal_id } : {}),
            fecha_venta: { gte: today_from, lte: today_to },
          },
          _sum: { total: true },
        });

        const objetivo = decimal_to_number(goal.monto_objetivo);
        const actual = decimal_to_number(totals._sum.total);

        return {
          id: goal.id,
          tipo: goal.usuario_id ? ("vendedor" as const) : ("sucursal" as const),
          nombre:
            goal.nombre ??
            (goal.usuario_id ? "Meta personal del dia" : "Meta de sucursal del dia"),
          monto_objetivo: objetivo,
          monto_actual: actual,
          porcentaje: objetivo > 0 ? Math.round((actual / objetivo) * 100) : 0,
        };
      }),
    ),
  };
}
