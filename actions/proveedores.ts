"use server";

import { revalidatePath } from "next/cache";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { require_roles } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";

function decimal_to_number(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getProveedores() {
  await require_roles(["admin", "gerente"]);

  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { productos: true, ordenes_compra: true } },
      ordenes_compra: {
        where: { estado: { not: "cancelada" } },
        select: { total: true, monto_pagado: true, fecha_vencimiento: true, estado: true },
      },
    },
  });

  const now = new Date();

  return proveedores.map((p) => {
    const saldo_pendiente = p.ordenes_compra.reduce(
      (acc, o) => acc + decimal_to_number(o.total) - decimal_to_number(o.monto_pagado),
      0,
    );
    const ordenes_vencidas = p.ordenes_compra.filter(
      (o) =>
        o.fecha_vencimiento &&
        o.fecha_vencimiento < now &&
        decimal_to_number(o.total) > decimal_to_number(o.monto_pagado),
    ).length;

    return {
      id: p.id,
      nombre: p.nombre,
      contacto: p.contacto,
      telefono: p.telefono,
      email: p.email,
      dias_credito: p.dias_credito,
      frecuencia_visita: p.frecuencia_visita,
      proxima_visita: p.proxima_visita?.toISOString().slice(0, 10) ?? null,
      monto_minimo_pedido: p.monto_minimo_pedido ? decimal_to_number(p.monto_minimo_pedido) : null,
      activo: p.activo,
      total_productos: p._count.productos,
      total_ordenes: p._count.ordenes_compra,
      saldo_pendiente,
      ordenes_vencidas,
    };
  });
}

export async function getProveedor(id: number) {
  await require_roles(["admin", "gerente"]);

  const p = await prisma.proveedor.findUnique({
    where: { id },
    include: {
      productos: {
        include: { producto: { select: { id: true, nombre: true, sku: true, categoria: true } } },
        orderBy: { es_principal: "desc" },
      },
      ordenes_compra: {
        orderBy: [{ estado: "asc" }, { created_at: "desc" }],
        include: {
          sucursal: { select: { nombre: true } },
          receptor: { select: { nombre: true } },
          detalle: {
            include: { producto: { select: { nombre: true, sku: true } } },
          },
          pagos: { orderBy: { fecha_pago: "desc" } },
        },
      },
      historial_precios: {
        orderBy: { created_at: "desc" },
        take: 30,
        include: { producto: { select: { nombre: true, sku: true } } },
      },
    },
  });

  if (!p) return null;

  const now = new Date();
  const saldo_pendiente = p.ordenes_compra
    .filter((o) => o.estado !== "cancelada")
    .reduce((acc, o) => acc + decimal_to_number(o.total) - decimal_to_number(o.monto_pagado), 0);

  return {
    ...p,
    proxima_visita: p.proxima_visita?.toISOString().slice(0, 10) ?? null,
    monto_minimo_pedido: p.monto_minimo_pedido ? decimal_to_number(p.monto_minimo_pedido) : null,
    saldo_pendiente,
    ordenes_compra: p.ordenes_compra.map((o) => ({
      ...o,
      total: decimal_to_number(o.total),
      monto_pagado: decimal_to_number(o.monto_pagado),
      saldo: decimal_to_number(o.total) - decimal_to_number(o.monto_pagado),
      vencida:
        o.fecha_vencimiento !== null &&
        o.fecha_vencimiento < now &&
        decimal_to_number(o.total) > decimal_to_number(o.monto_pagado),
      fecha_esperada: o.fecha_esperada?.toISOString().slice(0, 10) ?? null,
      fecha_recibida: o.fecha_recibida?.toISOString().slice(0, 10) ?? null,
      fecha_vencimiento: o.fecha_vencimiento?.toISOString().slice(0, 10) ?? null,
      pagos: o.pagos.map((pago) => ({
        ...pago,
        monto: decimal_to_number(pago.monto),
        fecha_pago: pago.fecha_pago.toISOString().slice(0, 10),
      })),
      detalle: o.detalle.map((d) => ({
        ...d,
        precio_unitario: decimal_to_number(d.precio_unitario),
        subtotal: decimal_to_number(d.subtotal),
      })),
    })),
    historial_precios: p.historial_precios.map((h) => ({
      ...h,
      precio_anterior: decimal_to_number(h.precio_anterior),
      precio_nuevo: decimal_to_number(h.precio_nuevo),
      created_at: h.created_at.toISOString().slice(0, 10),
    })),
  };
}

export async function getDeudasProximasVencer() {
  await require_roles(["admin", "gerente"]);

  const { sucursales } = await get_accessible_sucursales();
  const branch_ids = sucursales.map((s) => s.id);
  const now = new Date();
  const en_7_dias = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const ordenes = await prisma.ordenCompra.findMany({
    where: {
      sucursal_id: { in: branch_ids },
      estado: { not: "cancelada" },
      fecha_vencimiento: { lte: en_7_dias },
    },
    orderBy: { fecha_vencimiento: "asc" },
    include: { proveedor: { select: { nombre: true } } },
  });

  return ordenes
    .map((o) => ({
      id: o.id,
      folio: o.folio,
      proveedor: o.proveedor.nombre,
      saldo: decimal_to_number(o.total) - decimal_to_number(o.monto_pagado),
      fecha_vencimiento: o.fecha_vencimiento!.toISOString().slice(0, 10),
      vencida: o.fecha_vencimiento! < now,
    }))
    .filter((o) => o.saldo > 0);
}

// ─── Mutaciones ─────────────────────────────────────────────────────────────

export async function createProveedor(form_data: FormData) {
  await require_roles(["admin", "gerente"]);

  const nombre = String(form_data.get("nombre") ?? "").trim();
  if (!nombre) return { success: false as const, error: "El nombre es obligatorio." };

  const dias_credito_raw = Number(form_data.get("dias_credito") ?? 0);
  const frecuencia_raw = String(form_data.get("frecuencia_visita") ?? "").trim();
  const proxima_raw = String(form_data.get("proxima_visita") ?? "").trim();
  const monto_minimo_raw = String(form_data.get("monto_minimo_pedido") ?? "").trim();

  await prisma.proveedor.create({
    data: {
      nombre,
      contacto: String(form_data.get("contacto") ?? "").trim() || null,
      telefono: String(form_data.get("telefono") ?? "").trim() || null,
      email: String(form_data.get("email") ?? "").trim() || null,
      direccion: String(form_data.get("direccion") ?? "").trim() || null,
      dias_credito: Number.isFinite(dias_credito_raw) ? Math.max(0, dias_credito_raw) : 0,
      frecuencia_visita: frecuencia_raw ? Math.max(1, Number(frecuencia_raw)) : null,
      proxima_visita: proxima_raw ? new Date(`${proxima_raw}T00:00:00`) : null,
      monto_minimo_pedido: monto_minimo_raw ? Number(monto_minimo_raw) : null,
      notas: String(form_data.get("notas") ?? "").trim() || null,
    },
  });

  revalidatePath("/inventario/proveedores");
  return { success: true as const };
}

export async function updateProveedor(id: number, form_data: FormData) {
  await require_roles(["admin", "gerente"]);

  const nombre = String(form_data.get("nombre") ?? "").trim();
  if (!nombre) return { success: false as const, error: "El nombre es obligatorio." };

  const dias_credito_raw = Number(form_data.get("dias_credito") ?? 0);
  const frecuencia_raw = String(form_data.get("frecuencia_visita") ?? "").trim();
  const proxima_raw = String(form_data.get("proxima_visita") ?? "").trim();
  const monto_minimo_raw = String(form_data.get("monto_minimo_pedido") ?? "").trim();

  await prisma.proveedor.update({
    where: { id },
    data: {
      nombre,
      contacto: String(form_data.get("contacto") ?? "").trim() || null,
      telefono: String(form_data.get("telefono") ?? "").trim() || null,
      email: String(form_data.get("email") ?? "").trim() || null,
      direccion: String(form_data.get("direccion") ?? "").trim() || null,
      dias_credito: Number.isFinite(dias_credito_raw) ? Math.max(0, dias_credito_raw) : 0,
      frecuencia_visita: frecuencia_raw ? Math.max(1, Number(frecuencia_raw)) : null,
      proxima_visita: proxima_raw ? new Date(`${proxima_raw}T00:00:00`) : null,
      monto_minimo_pedido: monto_minimo_raw ? Number(monto_minimo_raw) : null,
      notas: String(form_data.get("notas") ?? "").trim() || null,
    },
  });

  revalidatePath("/inventario/proveedores");
  revalidatePath(`/inventario/proveedores/${id}`);
  return { success: true as const };
}

export async function toggleProveedorActivo(id: number) {
  await require_roles(["admin", "gerente"]);

  const proveedor = await prisma.proveedor.findUnique({ where: { id }, select: { activo: true } });
  if (!proveedor) return { success: false as const, error: "Proveedor no encontrado." };

  await prisma.proveedor.update({ where: { id }, data: { activo: !proveedor.activo } });

  revalidatePath("/inventario/proveedores");
  return { success: true as const };
}

export async function asignarProducto(
  proveedor_id: number,
  producto_id: number,
  precio_costo: number | null,
  es_principal: boolean,
) {
  await require_roles(["admin", "gerente"]);

  await prisma.proveedorProducto.upsert({
    where: { proveedor_id_producto_id: { proveedor_id, producto_id } },
    create: { proveedor_id, producto_id, precio_costo, es_principal },
    update: { precio_costo, es_principal },
  });

  revalidatePath(`/inventario/proveedores/${proveedor_id}`);
  return { success: true as const };
}

export async function desasignarProducto(proveedor_id: number, producto_id: number) {
  await require_roles(["admin", "gerente"]);

  await prisma.proveedorProducto.deleteMany({ where: { proveedor_id, producto_id } });

  revalidatePath(`/inventario/proveedores/${proveedor_id}`);
  return { success: true as const };
}
