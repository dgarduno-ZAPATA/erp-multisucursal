"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { get_current_user } from "@/lib/auth/session";
import { get_user_operating_assignment } from "@/lib/auth/operating-context";

export async function getFaltantes() {
  const faltantes = await prisma.faltante.findMany({
    orderBy: [{ estado: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      cantidad_faltante: true,
      motivo: true,
      estado: true,
      created_at: true,
      producto: { select: { id: true, nombre: true, sku: true } },
      sucursal: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true } },
    },
  });

  return faltantes.map((f) => ({
    id: f.id,
    cantidad_faltante: f.cantidad_faltante,
    motivo: f.motivo,
    estado: f.estado,
    created_at: f.created_at.toISOString(),
    producto_nombre: f.producto.nombre,
    producto_sku: f.producto.sku,
    sucursal_nombre: f.sucursal.nombre,
    usuario_nombre: f.usuario?.nombre ?? null,
  }));
}

export async function getRankingFaltantes() {
  const ranking = await prisma.faltante.groupBy({
    by: ["producto_id"],
    _sum: { cantidad_faltante: true },
    _count: { id: true },
    orderBy: { _sum: { cantidad_faltante: "desc" } },
    take: 10,
  });

  const producto_ids = ranking.map((r) => r.producto_id);
  const productos = await prisma.producto.findMany({
    where: { id: { in: producto_ids } },
    select: { id: true, nombre: true, precio: true },
  });

  return ranking.map((r) => {
    const producto = productos.find((p) => p.id === r.producto_id);
    const unidades = r._sum.cantidad_faltante ?? 0;
    const perdida_estimada = unidades * Number(producto?.precio ?? 0);
    return {
      producto_id: r.producto_id,
      nombre: producto?.nombre ?? `Producto #${r.producto_id}`,
      veces_reportado: r._count.id,
      unidades_faltantes: unidades,
      perdida_estimada,
    };
  });
}

export async function getFaltantesBoard() {
  const faltantes = await prisma.faltante.findMany({
    orderBy: [{ estado: "asc" }, { created_at: "desc" }],
    select: {
      id: true,
      cantidad_faltante: true,
      motivo: true,
      estado: true,
      created_at: true,
      producto: { select: { id: true, nombre: true, sku: true, precio: true } },
      sucursal: { select: { id: true, nombre: true } },
      usuario: { select: { id: true, nombre: true } },
    },
  });

  const pendientes = faltantes.filter((item) => item.estado === "pendiente");
  const atendidos = faltantes.filter((item) => item.estado === "atendido");

  const grouped_pending = new Map<
    string,
    {
      producto_id: number;
      producto_nombre: string;
      producto_sku: string;
      sucursal_id: number;
      sucursal_nombre: string;
      reportes: number;
      unidades: number;
      perdida_estimada: number;
      ultimo_reporte: string;
      usuarios: string[];
      motivos: string[];
    }
  >();

  for (const faltante of pendientes) {
    const key = `${faltante.producto.id}-${faltante.sucursal.id}`;
    const current = grouped_pending.get(key) ?? {
      producto_id: faltante.producto.id,
      producto_nombre: faltante.producto.nombre,
      producto_sku: faltante.producto.sku,
      sucursal_id: faltante.sucursal.id,
      sucursal_nombre: faltante.sucursal.nombre,
      reportes: 0,
      unidades: 0,
      perdida_estimada: 0,
      ultimo_reporte: faltante.created_at.toISOString(),
      usuarios: [],
      motivos: [],
    };

    current.reportes += 1;
    current.unidades += faltante.cantidad_faltante;
    current.perdida_estimada += faltante.cantidad_faltante * Number(faltante.producto.precio ?? 0);
    if (faltante.created_at.toISOString() > current.ultimo_reporte) {
      current.ultimo_reporte = faltante.created_at.toISOString();
    }
    if (faltante.usuario?.nombre && !current.usuarios.includes(faltante.usuario.nombre)) {
      current.usuarios.push(faltante.usuario.nombre);
    }
    if (faltante.motivo && !current.motivos.includes(faltante.motivo)) {
      current.motivos.push(faltante.motivo);
    }

    grouped_pending.set(key, current);
  }

  const cola_operativa = Array.from(grouped_pending.values()).sort((a, b) => {
    if (b.unidades !== a.unidades) return b.unidades - a.unidades;
    if (b.reportes !== a.reportes) return b.reportes - a.reportes;
    return b.ultimo_reporte.localeCompare(a.ultimo_reporte);
  });

  const top_sucursales = Array.from(
    pendientes.reduce((map, faltante) => {
      const current = map.get(faltante.sucursal.id) ?? {
        sucursal_id: faltante.sucursal.id,
        sucursal_nombre: faltante.sucursal.nombre,
        reportes: 0,
        unidades: 0,
      };
      current.reportes += 1;
      current.unidades += faltante.cantidad_faltante;
      map.set(faltante.sucursal.id, current);
      return map;
    }, new Map<number, { sucursal_id: number; sucursal_nombre: string; reportes: number; unidades: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 6);

  const reportes_hoy = pendientes.filter((item) => {
    const created = new Date(item.created_at);
    const now = new Date();
    return (
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate()
    );
  }).length;

  const perdida_estimada = cola_operativa.reduce((sum, item) => sum + item.perdida_estimada, 0);

  return {
    resumen: {
      pendientes: pendientes.length,
      atendidos: atendidos.length,
      grupos_pendientes: cola_operativa.length,
      reportes_hoy,
      perdida_estimada,
    },
    cola_operativa,
    top_sucursales,
    historial_atendido: atendidos.slice(0, 25).map((item) => ({
      id: item.id,
      producto_nombre: item.producto.nombre,
      producto_sku: item.producto.sku,
      sucursal_nombre: item.sucursal.nombre,
      cantidad_faltante: item.cantidad_faltante,
      usuario_nombre: item.usuario?.nombre ?? null,
      created_at: item.created_at.toISOString(),
    })),
  };
}

export async function crearFaltante(formData: FormData) {
  const producto_id = Number(formData.get("producto_id") ?? 0);
  const cantidad = Number(formData.get("cantidad_faltante") ?? 1);
  const motivo = String(formData.get("motivo") ?? "").trim() || null;

  if (!Number.isInteger(producto_id) || producto_id <= 0) {
    return { success: false, error: "Selecciona un producto válido." };
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { success: false, error: "La cantidad debe ser mayor a 0." };
  }

  const auth_user = await get_current_user();
  const operating_assignment = auth_user
    ? await get_user_operating_assignment(auth_user.id)
    : null;
  const usuario = operating_assignment?.usuario ?? null;
  const sucursal_id = operating_assignment?.sucursal_id ?? null;

  if (!sucursal_id) {
    return {
      success: false,
      error:
        usuario?.rol === "vendedor" || usuario?.rol === "cajero"
          ? "Registra primero tu sucursal operativa del dia."
          : "Tu usuario no tiene una sucursal asignada.",
    };
  }

  await prisma.faltante.create({
    data: {
      producto_id,
      sucursal_id,
      usuario_id: usuario?.id ?? null,
      cantidad_faltante: cantidad,
      motivo,
      estado: "pendiente",
    },
  });

  revalidatePath("/faltantes");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function atenderFaltante(id: number) {
  await prisma.faltante.update({
    where: { id },
    data: { estado: "atendido" },
  });

  revalidatePath("/faltantes");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function atenderGrupoFaltantes(producto_id: number, sucursal_id: number) {
  await prisma.faltante.updateMany({
    where: {
      producto_id,
      sucursal_id,
      estado: "pendiente",
    },
    data: {
      estado: "atendido",
    },
  });

  revalidatePath("/faltantes");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analitica");

  return { success: true };
}
