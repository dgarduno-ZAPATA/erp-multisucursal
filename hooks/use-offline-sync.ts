"use client";

import { useState, useEffect, useCallback, useRef } from "react";

import {
  get_pending_ventas,
  mark_synced,
  mark_error,
  purge_synced,
} from "@/lib/offline/queue";

function is_local_dev() {
  if (typeof window === "undefined") return false;
  return (
    process.env.NODE_ENV !== "production" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  );
}

export function use_offline_sync() {
  const [is_online, set_is_online] = useState(
    typeof navigator !== "undefined" ? is_local_dev() || navigator.onLine : true,
  );
  const [pending_count, set_pending_count] = useState(0);
  const [is_syncing, set_is_syncing] = useState(false);
  const [last_sync_at, set_last_sync_at] = useState<string | null>(null);
  const sync_lock = useRef(false);

  const refresh_pending = useCallback(async () => {
    try {
      const pending = await get_pending_ventas();
      set_pending_count(pending.length);
    } catch {
      // IndexedDB may be unavailable in some contexts
    }
  }, []);

  const sync_ventas = useCallback(async () => {
    const can_sync = is_local_dev() || navigator.onLine;
    if (sync_lock.current || !can_sync) return;
    sync_lock.current = true;
    set_is_syncing(true);

    try {
      const pending = await get_pending_ventas();
      if (pending.length === 0) return;

      let synced = 0;
      for (const v of pending) {
        try {
          const res = await fetch("/api/v1/ventas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: v.items,
              total: v.total,
              metodo_pago: v.metodo_pago,
            }),
          });
          const json = (await res.json()) as {
            success: boolean;
            data?: { venta_id: number };
            error?: { message: string };
          };
          if (json.success && json.data?.venta_id) {
            await mark_synced(v.local_id, json.data.venta_id);
            synced++;
          } else {
            await mark_error(v.local_id, json.error?.message ?? "Error del servidor");
          }
        } catch {
          await mark_error(v.local_id, "Error de red");
        }
      }

      await purge_synced();
      if (synced > 0) set_last_sync_at(new Date().toISOString());
    } finally {
      sync_lock.current = false;
      set_is_syncing(false);
      await refresh_pending();
    }
  }, [refresh_pending]);

  useEffect(() => {
    refresh_pending();

    function on_online() {
      set_is_online(true);
      sync_ventas();
    }
    function on_offline() {
      set_is_online(is_local_dev());
    }

    window.addEventListener("online", on_online);
    window.addEventListener("offline", on_offline);
    window.addEventListener("venta-enqueued", refresh_pending);
    return () => {
      window.removeEventListener("online", on_online);
      window.removeEventListener("offline", on_offline);
      window.removeEventListener("venta-enqueued", refresh_pending);
    };
  }, [sync_ventas, refresh_pending]);

  return { is_online, pending_count, is_syncing, last_sync_at, sync_ventas, refresh_pending };
}
