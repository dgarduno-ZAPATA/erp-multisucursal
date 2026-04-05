"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";

import { use_pos_store } from "@/hooks/use-pos-store";

type ScannedProduct = {
  id: number;
  sku: string;
  nombre: string;
  precio: number;
  categoria: string;
  stock_disponible: number;
};

type ScanFeedback =
  | { type: "success"; product: ScannedProduct }
  | { type: "error"; message: string }
  | { type: "scanning" }
  | null;

export function BarcodeScanner() {
  const [is_open, set_is_open] = useState(false);
  const [feedback, set_feedback] = useState<ScanFeedback>(null);
  const [camera_error, set_camera_error] = useState<string | null>(null);
  const [is_pending, start_transition] = useTransition();

  const video_ref = useRef<HTMLVideoElement>(null);
  const last_code_ref = useRef<string | null>(null);
  const cooldown_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const add_item = use_pos_store((state) => state.add_item);

  const handle_code = useCallback(
    (barcode: string) => {
      if (barcode === last_code_ref.current) return;
      last_code_ref.current = barcode;
      set_feedback({ type: "scanning" });

      start_transition(async () => {
        try {
          const res = await fetch(
            `/api/v1/productos/barcode/${encodeURIComponent(barcode)}`,
          );
          const json = (await res.json()) as {
            success: boolean;
            data: ScannedProduct | null;
          };

          if (!json.success || !json.data) {
            set_feedback({
              type: "error",
              message: `Sin producto para: ${barcode}`,
            });
          } else {
            const p = json.data;
            if (p.stock_disponible <= 0) {
              set_feedback({
                type: "error",
                message: `${p.nombre} no tiene stock disponible en esta sucursal.`,
              });
              return;
            }
            add_item({
              id: p.id,
              sku: p.sku,
              nombre: p.nombre,
              precio: p.precio,
              categoria: p.categoria,
              stock_disponible: p.stock_disponible,
            });
            set_feedback({ type: "success", product: p });
          }
        } catch {
          set_feedback({ type: "error", message: "Error al buscar el producto." });
        }

        cooldown_ref.current = setTimeout(() => {
          last_code_ref.current = null;
          set_feedback(null);
        }, 2500);
      });
    },
    [add_item],
  );

  useEffect(() => {
    if (!is_open) return;

    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    set_camera_error(null);
    set_feedback(null);

    import("@zxing/browser")
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !video_ref.current) return;

        const reader = new BrowserMultiFormatReader();
        reader
          .decodeFromVideoDevice(undefined, video_ref.current, (result, err) => {
            if (result) handle_code(result.getText());
            if (err && err.name !== "NotFoundException") {
              console.error("[BarcodeScanner]", err);
            }
          })
          .then((c) => {
            if (cancelled) {
              c.stop();
            } else {
              controls = c;
            }
          })
          .catch((err: unknown) => {
            if (!cancelled) {
              const msg =
                err instanceof Error &&
                err.message.toLowerCase().includes("permission")
                  ? "Permiso de cámara denegado. Habilítalo en la configuración del navegador."
                  : "No se pudo acceder a la cámara.";
              set_camera_error(msg);
            }
          });
      })
      .catch(() => {
        if (!cancelled) {
          set_camera_error("Error al cargar el escáner.");
        }
      });

    return () => {
      cancelled = true;
      controls?.stop();
      if (cooldown_ref.current) clearTimeout(cooldown_ref.current);
      last_code_ref.current = null;
    };
  }, [is_open, handle_code]);

  function handle_close() {
    set_is_open(false);
    set_feedback(null);
    set_camera_error(null);
    if (cooldown_ref.current) clearTimeout(cooldown_ref.current);
    last_code_ref.current = null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => set_is_open(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-400/20"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H4v2a1 1 0 0 1-2 0V4Zm9-1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V4h-2a1 1 0 0 1-1-1ZM4 14a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 0-2H4v-2a1 1 0 0 0-1-1Zm13 1a1 1 0 0 0-1-1 1 1 0 0 0-1 1v2h-2a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1v-2ZM9 6a1 1 0 0 1 1 1v6a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1Zm3 1a1 1 0 0 0-2 0v6a1 1 0 0 0 2 0V7Zm-6 0a1 1 0 0 0-2 0v6a1 1 0 0 0 2 0V7Z"
            clipRule="evenodd"
          />
        </svg>
        Escanear código
      </button>

      {is_open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  POS
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  Escanear código
                </h2>
              </div>
              <button
                type="button"
                onClick={handle_close}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Camera view */}
            <div className="relative mt-5 overflow-hidden rounded-2xl bg-black">
              {/* Scan frame overlay */}
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative h-36 w-56">
                  {/* Corner marks */}
                  <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-sky-400" />
                  <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-sky-400" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-sky-400" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-sky-400" />
                  {/* Scan line */}
                  <span className="absolute left-2 right-2 top-1/2 h-px bg-sky-400/60" />
                </div>
              </div>
              <video
                ref={video_ref}
                autoPlay
                muted
                playsInline
                className="w-full"
                style={{ maxHeight: "260px", objectFit: "cover" }}
              />
            </div>

            {/* Camera error */}
            {camera_error && (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                {camera_error}
              </div>
            )}

            {/* Scan feedback */}
            {!camera_error && (
              <>
                {(is_pending || feedback?.type === "scanning") && (
                  <div className="mt-4 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-center text-sm text-sky-300">
                    Buscando producto...
                  </div>
                )}

                {!is_pending && feedback?.type === "success" && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
                    <p className="font-semibold text-emerald-300">
                      Agregado al carrito
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-400/80">
                      {feedback.product.nombre}
                    </p>
                  </div>
                )}

                {!is_pending && feedback?.type === "error" && (
                  <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                    {feedback.message}
                  </div>
                )}

                {!is_pending && feedback === null && !camera_error && (
                  <p className="mt-3 text-center text-xs text-slate-500">
                    Apunta la cámara al código de barras del producto
                  </p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handle_close}
              className="mt-4 w-full rounded-2xl border border-slate-700 bg-transparent py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Cerrar escáner
            </button>
          </div>
        </div>
      )}
    </>
  );
}
