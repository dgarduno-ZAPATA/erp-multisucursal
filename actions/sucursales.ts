"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { require_roles } from "@/lib/auth/rbac";

export async function getSucursales() {
  await require_roles(["admin"]);

  return prisma.sucursal.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: {
      id: true,
      nombre: true,
      codigo: true,
      direccion: true,
      telefono: true,
      activo: true,
      _count: {
        select: {
          usuarios: true,
          inventario: true,
        },
      },
    },
  });
}

export async function createSucursal(formData: FormData) {
  await require_roles(["admin"]);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  if (!nombre) {
    return { success: false as const, error: "El nombre es requerido." };
  }

  if (!codigo) {
    return { success: false as const, error: "El codigo es requerido." };
  }

  try {
    await prisma.sucursal.create({
      data: {
        nombre,
        codigo,
        direccion,
        telefono,
        activo: true,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { success: false as const, error: "Ya existe una sucursal con ese codigo." };
    }

    return { success: false as const, error: "No se pudo crear la sucursal." };
  }

  revalidatePath("/configuracion/usuarios");
  revalidatePath("/inventario");
  return { success: true as const };
}
