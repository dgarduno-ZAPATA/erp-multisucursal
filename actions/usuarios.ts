"use server";

import { revalidatePath } from "next/cache";

import { create_auth_user_with_profile, sync_auth_user_metadata } from "@/lib/auth/auth-user-admin";
import { prisma } from "@/lib/db/prisma";
import { require_roles } from "@/lib/auth/rbac";

export async function getUsuarios() {
  await require_roles(["admin"]);

  const raw = await prisma.usuario.findMany({
    orderBy: [{ rol: "asc" }, { nombre: "asc" }],
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true,
      activo: true,
      pin: true,
      sucursal_id: true,
      sucursal: { select: { id: true, nombre: true } },
    },
  });

  return raw.map(({ pin, ...u }) => ({ ...u, has_pin: pin !== null }));
}

export type UsuarioRow = Awaited<ReturnType<typeof getUsuarios>>[number];

export async function createUsuario(formData: FormData) {
  await require_roles(["admin"]);

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();
  const sucursal_raw = String(formData.get("sucursal_id") ?? "").trim();

  if (!nombre) {
    return { success: false as const, error: "El nombre es requerido." };
  }

  if (!email || !email.includes("@")) {
    return { success: false as const, error: "Ingresa un correo valido." };
  }

  if (password.length < 8) {
    return { success: false as const, error: "La contrasena debe tener al menos 8 caracteres." };
  }

  if (!["admin", "gerente", "cajero", "vendedor"].includes(rol)) {
    return { success: false as const, error: "Rol invalido." };
  }

  let sucursal_id: number | null = null;
  if (sucursal_raw !== "") {
    const parsed_sucursal_id = Number(sucursal_raw);
    if (!Number.isInteger(parsed_sucursal_id) || parsed_sucursal_id <= 0) {
      return { success: false as const, error: "Sucursal invalida." };
    }
    sucursal_id = parsed_sucursal_id;
  }

  let sucursal_nombre: string | null = null;
  if (sucursal_id !== null) {
    const selected_sucursal_id = sucursal_id;
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: selected_sucursal_id },
      select: { id: true, nombre: true, activo: true },
    });

    if (!sucursal?.activo) {
      return { success: false as const, error: "La sucursal seleccionada no esta disponible." };
    }

    sucursal_nombre = sucursal.nombre;
  }

  const result = await create_auth_user_with_profile({
    nombre,
    email,
    password,
    rol: rol as "admin" | "gerente" | "cajero" | "vendedor",
    sucursal_id,
    sucursal_nombre,
  });

  if (!result.success) {
    return result;
  }

  revalidatePath("/configuracion/usuarios");
  return { success: true as const };
}

export async function updateUsuarioAcceso(formData: FormData) {
  await require_roles(["admin"]);

  const usuario_id = String(formData.get("usuario_id") ?? "").trim();
  const rol = String(formData.get("rol") ?? "").trim();
  const sucursal_raw = String(formData.get("sucursal_id") ?? "").trim();
  const activo_raw = String(formData.get("activo") ?? "").trim();

  if (!usuario_id) {
    return { success: false as const, error: "Usuario invalido." };
  }

  if (!["admin", "gerente", "cajero", "vendedor"].includes(rol)) {
    return { success: false as const, error: "Rol invalido." };
  }

  const sucursal_id =
    sucursal_raw === "" ? null : Number.isInteger(Number(sucursal_raw)) ? Number(sucursal_raw) : NaN;

  if (Number.isNaN(sucursal_id)) {
    return { success: false as const, error: "Sucursal invalida." };
  }

  const activo = activo_raw === "true";

  let sucursal_nombre: string | null = null;
  if (sucursal_id !== null) {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursal_id },
      select: { id: true, nombre: true, activo: true },
    });

    if (!sucursal?.activo) {
      return { success: false as const, error: "Sucursal invalida." };
    }

    sucursal_nombre = sucursal.nombre;
  }

  try {
    const usuario = await prisma.usuario.update({
      where: { id: usuario_id },
      data: {
        rol: rol as "admin" | "gerente" | "cajero" | "vendedor",
        sucursal_id,
        activo,
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    await sync_auth_user_metadata({
      user_id: usuario.id,
      nombre: usuario.nombre,
      rol: rol as "admin" | "gerente" | "cajero" | "vendedor",
      sucursal_nombre,
    });
  } catch {
    return { success: false as const, error: "No se pudo actualizar el usuario." };
  }

  revalidatePath("/configuracion/usuarios");
  revalidatePath("/pos");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { success: true as const };
}

export async function setPin(usuario_id: string, pin: string) {
  await require_roles(["admin"]);

  if (!/^\d{4,6}$/.test(pin)) {
    return { success: false as const, error: "El PIN debe ser de 4 a 6 dígitos numéricos." };
  }

  // Check PIN is unique across all active users
  const existing = await prisma.usuario.findFirst({
    where: { pin, activo: true, id: { not: usuario_id } },
    select: { id: true },
  });
  if (existing) {
    return { success: false as const, error: "Ese PIN ya está en uso por otro usuario." };
  }

  await prisma.usuario.update({
    where: { id: usuario_id },
    data: { pin },
  });

  revalidatePath("/configuracion/usuarios");
  return { success: true as const };
}

export async function clearPin(usuario_id: string) {
  await require_roles(["admin"]);
  await prisma.usuario.update({ where: { id: usuario_id }, data: { pin: null } });
  revalidatePath("/configuracion/usuarios");
  return { success: true as const };
}

export async function verifyPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) return null;

  const usuario = await prisma.usuario.findFirst({
    where: { pin, activo: true },
    select: { id: true, nombre: true, rol: true, sucursal_id: true },
  });

  return usuario;
}
