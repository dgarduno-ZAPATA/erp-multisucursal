"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { create_query_client } from "@/lib/query-client";

type ProvidersProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Detects stale chunk 404/500 errors and forces a clean reload.
 * This prevents the blank-page scenario after large file edits
 * cause the dev server to recompile with new chunk names.
 */
function useChunkErrorRecovery() {
  useEffect(() => {
    let reloading = false;

    function handle(event: ErrorEvent) {
      if (reloading) return;
      const msg = event.message ?? "";
      if (
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("ChunkLoadError")
      ) {
        reloading = true;
        window.location.reload();
      }
    }

    function handleRejection(event: PromiseRejectionEvent) {
      if (reloading) return;
      const reason = String(event.reason?.message ?? event.reason ?? "");
      if (
        reason.includes("Loading chunk") ||
        reason.includes("Failed to fetch dynamically imported module") ||
        reason.includes("ChunkLoadError")
      ) {
        reloading = true;
        window.location.reload();
      }
    }

    window.addEventListener("error", handle);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handle);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);
}

export function Providers({ children }: ProvidersProps) {
  const [query_client] = useState(() => create_query_client());

  useChunkErrorRecovery();

  return (
    <QueryClientProvider client={query_client}>{children}</QueryClientProvider>
  );
}
