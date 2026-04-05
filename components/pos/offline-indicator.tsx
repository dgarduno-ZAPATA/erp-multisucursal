"use client";

import { use_offline_sync } from "@/hooks/use-offline-sync";

export function OfflineIndicator() {
  const { is_online, pending_count, is_syncing, sync_ventas } = use_offline_sync();

  if (is_online && pending_count === 0) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        !is_online
          ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
          : "border-amber-400/20 bg-amber-400/10 text-amber-300"
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          !is_online ? "animate-pulse bg-rose-400" : "bg-amber-400"
        }`}
      />
      <span className="font-semibold">
        {!is_online
          ? `Sin conexión${pending_count > 0 ? ` · ${pending_count} venta${pending_count !== 1 ? "s" : ""} en cola` : ""}`
          : `${pending_count} venta${pending_count !== 1 ? "s" : ""} pendiente${pending_count !== 1 ? "s" : ""} de sincronizar`}
      </span>

      {is_online && pending_count > 0 && (
        <button
          type="button"
          onClick={() => void sync_ventas()}
          disabled={is_syncing}
          className="ml-auto shrink-0 text-xs font-semibold underline decoration-amber-400/50 hover:no-underline disabled:opacity-50"
        >
          {is_syncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      )}
    </div>
  );
}
