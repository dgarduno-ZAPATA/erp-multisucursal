"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { get_accessible_sucursales } from "@/lib/auth/operating-context";
import { get_current_db_user } from "@/lib/auth/operating-context";
import { prisma } from "@/lib/db/prisma";
import { log_inventory_movement } from "@/lib/inventory/movements";

type GetProductosOptions = {
  sucursal_id?: number;
};

export async function getProductos(options: GetProductosOptions = {}) {
  const { sucursal_id } = options;
  const productos = await prisma.producto.findMany({
    orderBy: {
      nombre: "asc",
    },
    select: {
      id: true,
      sku: true,
      codigo_barras: true,
      nombre: true,
      categoria: true,
      imagenUrl: true,
      precio: true,
      stock_minimo: true,
      activo: true,
      inventario: {
        select: {
          id: true,
          stock_actual: true,
          stock_minimo: true,
          sucursal_id: true,
        },
      },
    },
  });

  return productos.map((producto) => {
    const inventario_sucursal = sucursal_id
      ? producto.inventario.find((item) => item.sucursal_id === sucursal_id) ?? null
      : null;
    const stock = inventario_sucursal
      ? inventario_sucursal.stock_actual
      : producto.inventario.reduce((sum, item) => sum + item.stock_actual, 0);
    const stock_minimo = inventario_sucursal?.stock_minimo ?? producto.stock_minimo;

    return {
      id: producto.id,
      sku: producto.sku,
      codigo_barras: producto.codigo_barras,
      nombre: producto.nombre,
      categoria: producto.categoria,
      imagenUrl: producto.imagenUrl,
      precio: Number(producto.precio),
      estado: producto.activo ? "Activo" : "Inactivo",
      inventario_id: inventario_sucursal?.id ?? producto.inventario[0]?.id ?? null,
      sucursal_id: inventario_sucursal?.sucursal_id ?? sucursal_id ?? null,
      stock_minimo,
      stock,
    };
  });
}

export async function createProducto(formData: FormData) {
  const sku = String(formData.get("sku") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "General").trim() || "General";
  const codigo_barras = String(formData.get("codigo_barras") ?? "").trim() || null;
  const precio = Number(formData.get("precio") ?? 0);
  const costo_raw = formData.get("costo");
  const costo = costo_raw && String(costo_raw).trim() !== "" ? Number(costo_raw) : null;
  const stock_inicial = Number(formData.get("stock_inicial") ?? 0);
  const stock_minimo = Number(formData.get("stock_minimo") ?? 5);
  const sucursal_id = Number(formData.get("sucursal_id") ?? 0);
  const imagen_file = formData.get("imagen");
  const current_user = await get_current_db_user();

  let imagenUrl: string | null = null;

  if (!sku || !nombre || !Number.isFinite(precio) || precio <= 0) {
    redirect("/inventario/nuevo?error=Datos%20invalidos.");
  }

  if (imagen_file instanceof File && imagen_file.size > 0) {
    const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabase_url || !supabase_anon_key) {
      redirect("/inventario/nuevo?error=Faltan%20variables%20de%20Supabase%20para%20Storage.");
    }

    const file_extension = imagen_file.name.split(".").pop() ?? "jpg";
    const file_name = `${Date.now()}-${randomUUID()}.${file_extension}`;
    const buffer = Buffer.from(await imagen_file.arrayBuffer());

    const upload_response = await fetch(
      `${supabase_url}/storage/v1/object/productos/${file_name}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabase_anon_key}`,
          "Content-Type": imagen_file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: buffer,
      },
    );

    if (!upload_response.ok) {
      redirect("/inventario/nuevo?error=No%20se%20pudo%20subir%20la%20imagen.");
    }

    imagenUrl = `${supabase_url}/storage/v1/object/public/productos/${file_name}`;
  }

  const { sucursales } = await get_accessible_sucursales();
  const sucursal = sucursales.find((item) => item.id === sucursal_id);

  if (!sucursal) {
    redirect("/inventario/nuevo?error=Selecciona%20una%20sucursal%20valida.");
  }

  const producto = await prisma.producto.create({
    data: {
      sku,
      nombre,
      categoria,
      codigo_barras,
      imagenUrl,
      precio,
      costo,
      stock_minimo: Number.isFinite(stock_minimo) && stock_minimo >= 0 ? stock_minimo : 5,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  await prisma.inventario.create({
    data: {
      producto_id: producto.id,
      sucursal_id: sucursal.id,
      stock_actual: Number.isFinite(stock_inicial) && stock_inicial > 0 ? stock_inicial : 0,
      stock_minimo: Number.isFinite(stock_minimo) && stock_minimo >= 0 ? stock_minimo : 5,
    },
  });

  const stock_inicial_final = Number.isFinite(stock_inicial) && stock_inicial > 0 ? stock_inicial : 0;
  if (stock_inicial_final > 0) {
    await log_inventory_movement({
      producto_id: producto.id,
      sucursal_id: sucursal.id,
      usuario_id: current_user?.id ?? null,
      tipo: "entrada",
      cantidad: stock_inicial_final,
      stock_anterior: 0,
      stock_nuevo: stock_inicial_final,
      motivo: "Stock inicial al crear producto",
      referencia: `ALTA-${producto.id}`,
    });
  }

  revalidatePath("/inventario");
  revalidatePath("/pos");
  redirect("/inventario");
}

export async function restockProducto(formData: FormData) {
  const producto_id = Number(formData.get("producto_id") ?? 0);
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const stock_minimo = Number(formData.get("stock_minimo") ?? 5);
  const sucursal_id = Number(formData.get("sucursal_id") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const current_user = await get_current_db_user();

  if (!Number.isInteger(producto_id) || producto_id <= 0) {
    redirect("/inventario?error=Producto%20invalido.");
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    redirect("/inventario?error=La%20cantidad%20debe%20ser%20mayor%20a%200.");
  }

  if (!Number.isInteger(stock_minimo) || stock_minimo < 0) {
    return {
      success: false,
      error: "El stock minimo no puede ser negativo.",
    };
  }

  const { sucursales } = await get_accessible_sucursales();
  const sucursal = sucursales.find((item) => item.id === sucursal_id);

  if (!sucursal) {
    return {
      success: false,
      error: "Selecciona una sucursal valida para el ajuste.",
    };
  }

  const existing_inventory = await prisma.inventario.findUnique({
    where: {
      producto_id_sucursal_id: {
        producto_id,
        sucursal_id: sucursal.id,
      },
    },
    select: {
      stock_actual: true,
    },
  });

  const stock_anterior = existing_inventory?.stock_actual ?? 0;
  const stock_nuevo = stock_anterior + cantidad;

  await prisma.inventario.upsert({
    where: {
      producto_id_sucursal_id: {
        producto_id,
        sucursal_id: sucursal.id,
      },
    },
    update: {
      stock_actual: {
        increment: cantidad,
      },
      stock_minimo,
    },
    create: {
      producto_id,
      sucursal_id: sucursal.id,
      stock_actual: cantidad,
      stock_minimo,
    },
  });

  await log_inventory_movement({
    producto_id,
    sucursal_id: sucursal.id,
    usuario_id: current_user?.id ?? null,
    tipo: "entrada",
    cantidad,
    stock_anterior,
    stock_nuevo,
    motivo: motivo ?? "Recarga manual de inventario",
    referencia: `RESTOCK-${producto_id}-${Date.now()}`,
  });

  revalidatePath("/inventario");

  return {
    success: true,
  };
}

export async function ajustarStockProducto(formData: FormData) {
  const producto_id = Number(formData.get("producto_id") ?? 0);
  const sucursal_id = Number(formData.get("sucursal_id") ?? 0);
  const ajuste = Number(formData.get("ajuste") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const current_user = await get_current_db_user();

  if (!Number.isInteger(producto_id) || producto_id <= 0) {
    return { success: false as const, error: "Producto invalido." };
  }

  if (!Number.isInteger(sucursal_id) || sucursal_id <= 0) {
    return { success: false as const, error: "Sucursal invalida." };
  }

  if (!Number.isInteger(ajuste) || ajuste === 0) {
    return { success: false as const, error: "El ajuste debe ser un numero entero distinto de 0." };
  }

  const { sucursales } = await get_accessible_sucursales();
  const sucursal = sucursales.find((item) => item.id === sucursal_id);
  if (!sucursal) {
    return { success: false as const, error: "No tienes acceso a esa sucursal." };
  }

  const inventario = await prisma.inventario.findUnique({
    where: {
      producto_id_sucursal_id: {
        producto_id,
        sucursal_id,
      },
    },
    select: {
      stock_actual: true,
    },
  });

  if (!inventario) {
    return { success: false as const, error: "No existe inventario para ese producto en la sucursal seleccionada." };
  }

  const stock_anterior = inventario.stock_actual;
  const stock_nuevo = stock_anterior + ajuste;

  if (stock_nuevo < 0) {
    return { success: false as const, error: "El ajuste dejaria el stock en negativo." };
  }

  await prisma.inventario.update({
    where: {
      producto_id_sucursal_id: {
        producto_id,
        sucursal_id,
      },
    },
    data: {
      stock_actual: stock_nuevo,
    },
  });

  await log_inventory_movement({
    producto_id,
    sucursal_id,
    usuario_id: current_user?.id ?? null,
    tipo: "ajuste",
    cantidad: ajuste,
    stock_anterior,
    stock_nuevo,
    motivo: motivo ?? "Ajuste manual de inventario",
    referencia: `AJUSTE-${producto_id}-${Date.now()}`,
  });

  revalidatePath("/inventario");
  return { success: true as const };
}

export async function transferirStockProducto(formData: FormData) {
  const producto_id = Number(formData.get("producto_id") ?? 0);
  const sucursal_origen_id = Number(formData.get("sucursal_origen_id") ?? 0);
  const sucursal_destino_id = Number(formData.get("sucursal_destino_id") ?? 0);
  const cantidad = Number(formData.get("cantidad") ?? 0);
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  const current_user = await get_current_db_user();

  if (!Number.isInteger(producto_id) || producto_id <= 0) {
    return { success: false as const, error: "Producto invalido." };
  }

  if (!Number.isInteger(sucursal_origen_id) || sucursal_origen_id <= 0) {
    return { success: false as const, error: "Sucursal origen invalida." };
  }

  if (!Number.isInteger(sucursal_destino_id) || sucursal_destino_id <= 0) {
    return { success: false as const, error: "Sucursal destino invalida." };
  }

  if (sucursal_origen_id === sucursal_destino_id) {
    return { success: false as const, error: "El origen y destino deben ser diferentes." };
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return { success: false as const, error: "La cantidad debe ser mayor a 0." };
  }

  const { sucursales } = await get_accessible_sucursales();
  const origen = sucursales.find((item) => item.id === sucursal_origen_id);
  const destino = sucursales.find((item) => item.id === sucursal_destino_id);

  if (!origen || !destino) {
    return { success: false as const, error: "No tienes acceso a alguna de las sucursales seleccionadas." };
  }

  const referencia = `TRF-${producto_id}-${Date.now()}`;

  try {
    await prisma.$transaction(async (tx) => {
      const inventario_origen = await tx.inventario.findUnique({
        where: {
          producto_id_sucursal_id: {
            producto_id,
            sucursal_id: sucursal_origen_id,
          },
        },
        select: {
          stock_actual: true,
          stock_minimo: true,
        },
      });

      if (!inventario_origen) {
        throw new Error("No existe inventario del producto en la sucursal origen.");
      }

      if (inventario_origen.stock_actual < cantidad) {
        throw new Error(`Stock insuficiente en origen. Disponible: ${inventario_origen.stock_actual}.`);
      }

      const inventario_destino = await tx.inventario.findUnique({
        where: {
          producto_id_sucursal_id: {
            producto_id,
            sucursal_id: sucursal_destino_id,
          },
        },
        select: {
          stock_actual: true,
          stock_minimo: true,
        },
      });

      const stock_origen_anterior = inventario_origen.stock_actual;
      const stock_origen_nuevo = stock_origen_anterior - cantidad;
      const stock_destino_anterior = inventario_destino?.stock_actual ?? 0;
      const stock_destino_nuevo = stock_destino_anterior + cantidad;

      await tx.inventario.update({
        where: {
          producto_id_sucursal_id: {
            producto_id,
            sucursal_id: sucursal_origen_id,
          },
        },
        data: {
          stock_actual: stock_origen_nuevo,
        },
      });

      await tx.inventario.upsert({
        where: {
          producto_id_sucursal_id: {
            producto_id,
            sucursal_id: sucursal_destino_id,
          },
        },
        update: {
          stock_actual: stock_destino_nuevo,
        },
        create: {
          producto_id,
          sucursal_id: sucursal_destino_id,
          stock_actual: cantidad,
          stock_minimo: inventario_destino?.stock_minimo ?? inventario_origen.stock_minimo,
        },
      });

      await log_inventory_movement(
        {
          producto_id,
          sucursal_id: sucursal_origen_id,
          usuario_id: current_user?.id ?? null,
          tipo: "salida",
          cantidad,
          stock_anterior: stock_origen_anterior,
          stock_nuevo: stock_origen_nuevo,
          motivo: motivo ?? `Transferencia a ${destino.nombre}`,
          referencia,
        },
        tx,
      );

      await log_inventory_movement(
        {
          producto_id,
          sucursal_id: sucursal_destino_id,
          usuario_id: current_user?.id ?? null,
          tipo: "entrada",
          cantidad,
          stock_anterior: stock_destino_anterior,
          stock_nuevo: stock_destino_nuevo,
          motivo: motivo ?? `Transferencia desde ${origen.nombre}`,
          referencia,
        },
        tx,
      );
    });
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "No se pudo transferir el stock.",
    };
  }

  revalidatePath("/inventario");
  return { success: true as const };
}

export async function getProductoById(id: number) {
  return prisma.producto.findUnique({
    where: { id },
    select: {
      id: true,
      sku: true,
      codigo_barras: true,
      nombre: true,
      categoria: true,
      descripcion: true,
      precio: true,
      costo: true,
      stock_minimo: true,
      imagenUrl: true,
      activo: true,
      inventario: {
        select: {
          id: true,
          sucursal_id: true,
          stock_actual: true,
          stock_minimo: true,
          sucursal: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
            },
          },
        },
        orderBy: {
          sucursal: {
            nombre: "asc",
          },
        },
      },
    },
  });
}

export async function updateProducto(formData: FormData) {
  const id = Number(formData.get("id") ?? 0);
  if (!Number.isInteger(id) || id <= 0) {
    redirect("/inventario?error=Producto+invalido.");
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "General").trim() || "General";
  const codigo_barras = String(formData.get("codigo_barras") ?? "").trim() || null;
  const precio = Number(formData.get("precio") ?? 0);
  const costo_raw = formData.get("costo");
  const costo = costo_raw && String(costo_raw).trim() !== "" ? Number(costo_raw) : null;
  const stock_minimo = Number(formData.get("stock_minimo") ?? 5);
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const activo = formData.get("activo") === "true";
  const imagen_file = formData.get("imagen");

  if (!sku || !nombre || !Number.isFinite(precio) || precio <= 0) {
    redirect(`/inventario/${id}/editar?error=Datos+invalidos.`);
  }

  let imagenUrl: string | undefined = undefined;

  if (imagen_file instanceof File && imagen_file.size > 0) {
    const supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabase_url || !supabase_anon_key) {
      redirect(`/inventario/${id}/editar?error=Faltan+variables+de+Supabase.`);
    }

    const file_extension = imagen_file.name.split(".").pop() ?? "jpg";
    const file_name = `${Date.now()}-${randomUUID()}.${file_extension}`;
    const buffer = Buffer.from(await imagen_file.arrayBuffer());

    const upload_response = await fetch(
      `${supabase_url}/storage/v1/object/productos/${file_name}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabase_anon_key}`,
          "Content-Type": imagen_file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: buffer,
      },
    );

    if (!upload_response.ok) {
      redirect(`/inventario/${id}/editar?error=No+se+pudo+subir+la+imagen.`);
    }

    imagenUrl = `${supabase_url}/storage/v1/object/public/productos/${file_name}`;
  }

  await prisma.producto.update({
    where: { id },
    data: {
      sku,
      nombre,
      categoria,
      codigo_barras,
      precio,
      costo,
      stock_minimo: Number.isFinite(stock_minimo) && stock_minimo >= 0 ? stock_minimo : 5,
      descripcion,
      activo,
      ...(imagenUrl !== undefined ? { imagenUrl } : {}),
    },
  });

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${id}/editar`);
  revalidatePath("/pos");
  redirect(`/inventario/${id}/editar?ok=1`);
}
