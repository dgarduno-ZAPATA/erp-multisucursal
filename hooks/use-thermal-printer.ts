"use client";

import { useState, useCallback, useRef } from "react";

import type { PrinterConnection } from "@/lib/printing/bluetooth";

export type PrinterStatus = "idle" | "connecting" | "connected" | "printing" | "error";

export function use_thermal_printer() {
  const [status, set_status] = useState<PrinterStatus>("idle");
  const [error, set_error] = useState<string | null>(null);
  const conn_ref = useRef<PrinterConnection | null>(null);

  function on_disconnected() {
    conn_ref.current = null;
    set_status("idle");
    set_error(null);
  }

  const connect = useCallback(async (): Promise<PrinterConnection | null> => {
    set_status("connecting");
    set_error(null);
    try {
      const { connect_printer } = await import("@/lib/printing/bluetooth");
      const conn = await connect_printer();
      conn.device.addEventListener("gattserverdisconnected", on_disconnected);
      conn_ref.current = conn;
      set_status("connected");
      return conn;
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Error al conectar la impresora.");
      set_status("error");
      return null;
    }
  }, []);

  // Silently reconnect to a previously paired printer (no picker shown).
  const auto_connect = useCallback(async (): Promise<PrinterConnection | null> => {
    if (conn_ref.current) return conn_ref.current;
    set_status("connecting");
    set_error(null);
    try {
      const { get_remembered_printer } = await import("@/lib/printing/bluetooth");
      const conn = await get_remembered_printer();
      if (conn) {
        conn.device.addEventListener("gattserverdisconnected", on_disconnected);
        conn_ref.current = conn;
        set_status("connected");
        return conn;
      }
      // No remembered device → fall back to manual picker
      return await connect();
    } catch (err) {
      set_error(err instanceof Error ? err.message : "Error al conectar la impresora.");
      set_status("error");
      return null;
    }
  }, [connect]);

  const disconnect = useCallback(() => {
    conn_ref.current?.device.gatt?.disconnect();
    conn_ref.current = null;
    set_status("idle");
    set_error(null);
  }, []);

  // connect (if needed) then print — all in one action
  const print = useCallback(
    async (data: Uint8Array) => {
      set_error(null);

      let conn = conn_ref.current;
      if (!conn) {
        conn = await connect();
        if (!conn) return; // connect failed — error already set
      }

      set_status("printing");
      try {
        const { print_bytes } = await import("@/lib/printing/bluetooth");
        await print_bytes(conn.characteristic, data);
        set_status("connected");
      } catch (err) {
        set_error(err instanceof Error ? err.message : "Error al imprimir.");
        set_status("error");
      }
    },
    [connect],
  );

  return {
    status,
    error,
    is_connected: status === "connected" || status === "printing",
    connect,
    auto_connect,
    disconnect,
    print,
  };
}
