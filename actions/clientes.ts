"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";

export async function getClientes() {
  const clientes = await prisma.cliente.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      activo: true,
      created_at: true,
      ventas: {
        where: { estado: "completada" },
        select: { total: true, fecha_venta: true },
        orderBy: { fecha_venta: "desc" },
      },
    },
  });

  return clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    total_compras: c.ventas.length,
    ltv: c.ventas.reduce((s, v) => s + Number(v.total), 0),
    ultima_compra: c.ventas[0]?.fecha_venta.toISOString() ?? null,
    created_at: c.created_at.toISOString(),
  }));
}

export type ClienteRow = Awaited<ReturnType<typeof getClientes>>[number];

export async function getClienteById(id: number) {
  const c = await prisma.cliente.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      email: true,
      telefono: true,
      direccion: true,
      activo: true,
      created_at: true,
      ventas: {
        where: { estado: "completada" },
        orderBy: { fecha_venta: "desc" },
        select: {
          id: true,
          folio: true,
          total: true,
          metodo_pago: true,
          fecha_venta: true,
          sucursal: { select: { nombre: true } },
          detalle_venta: {
            select: {
              cantidad: true,
              precio_unitario: true,
              subtotal: true,
              producto: { select: { nombre: true, sku: true } },
            },
          },
        },
      },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    nombre: c.nombre,
    email: c.email,
    telefono: c.telefono,
    direccion: c.direccion,
    activo: c.activo,
    created_at: c.created_at.toISOString(),
    total_compras: c.ventas.length,
    ltv: c.ventas.reduce((s, v) => s + Number(v.total), 0),
    ticket_promedio:
      c.ventas.length > 0
        ? c.ventas.reduce((s, v) => s + Number(v.total), 0) / c.ventas.length
        : 0,
    ventas: c.ventas.map((v) => ({
      id: v.id,
      folio: v.folio,
      total: Number(v.total),
      metodo_pago: v.metodo_pago,
      fecha_venta: v.fecha_venta.toISOString(),
      sucursal_nombre: v.sucursal.nombre,
      items: v.detalle_venta.map((d) => ({
        nombre: d.producto.nombre,
        sku: d.producto.sku,
        cantidad: d.cantidad,
        precio_unitario: Number(d.precio_unitario),
        subtotal: Number(d.subtotal),
      })),
    })),
  };
}

export type ClienteDetalle = NonNullable<Awaited<ReturnType<typeof getClienteById>>>;

export async function createCliente(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;

  if (!nombre) {
    redirect("/clientes/nuevo?error=El%20nombre%20es%20requerido.");
  }

  let cliente_id: number;
  try {
    const cliente = await prisma.cliente.create({
      data: { nombre, email, telefono, direccion, activo: true },
      select: { id: true },
    });
    cliente_id = cliente.id;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      redirect("/clientes/nuevo?error=Ya%20existe%20un%20cliente%20con%20ese%20email.");
    }
    redirect("/clientes/nuevo?error=Error%20al%20crear%20el%20cliente.");
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente_id}`);
}

export async function updateCliente(id: number, formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;

  if (!nombre) return { success: false as const, error: "El nombre es requerido." };

  try {
    await prisma.cliente.update({
      where: { id },
      data: { nombre, email, telefono, direccion },
    });
  } catch {
    return { success: false as const, error: "Error al actualizar el cliente." };
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true as const };
}
