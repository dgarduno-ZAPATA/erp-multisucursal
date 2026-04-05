import type { MetodoPago } from "@prisma/client";

import { idb_add, idb_get_all, idb_put, idb_delete } from "./idb";
import type { PosCartItem } from "@/hooks/use-pos-store";

export type QueuedVenta = {
  local_id: number;
  items: PosCartItem[];
  total: number;
  metodo_pago: MetodoPago;
  queued_at: string;
  status: "pending" | "syncing" | "synced" | "error";
  error?: string;
  venta_id?: number;
};

export async function enqueue_venta(
  items: PosCartItem[],
  total: number,
  metodo_pago: MetodoPago,
): Promise<number> {
  return idb_add<QueuedVenta>({
    items,
    total,
    metodo_pago,
    queued_at: new Date().toISOString(),
    status: "pending",
  } as Omit<QueuedVenta, "local_id">);
}

export async function get_pending_ventas(): Promise<QueuedVenta[]> {
  const all = await idb_get_all<QueuedVenta>();
  return all.filter((v) => v.status === "pending" || v.status === "error");
}

export async function get_all_queued(): Promise<QueuedVenta[]> {
  return idb_get_all<QueuedVenta>();
}

export async function mark_synced(local_id: number, venta_id: number): Promise<void> {
  const all = await idb_get_all<QueuedVenta>();
  const entry = all.find((v) => v.local_id === local_id);
  if (entry) await idb_put({ ...entry, status: "synced", venta_id });
}

export async function mark_error(local_id: number, error: string): Promise<void> {
  const all = await idb_get_all<QueuedVenta>();
  const entry = all.find((v) => v.local_id === local_id);
  if (entry) await idb_put({ ...entry, status: "error", error });
}

export async function purge_synced(): Promise<void> {
  const all = await idb_get_all<QueuedVenta>();
  await Promise.all(
    all.filter((v) => v.status === "synced").map((v) => idb_delete(v.local_id)),
  );
}
