"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";

import { buscar_producto_por_barcode } from "@/actions/entrada";
import { restockProducto } from "@/actions/productos";
import type { ProductoEntrada } from "@/actions/entrada";

type Sucursal = { id: number; nombre: string; codigo: string };

type Props = {
  sucursales: Sucursal[];
};

type Estado = "idle" | "scanning" | "found" | "not_found" | "success";

export function EntradaEscaner({ sucursales }: Props) {
  const [estado, set_estado] = useState<Estado>("idle");
  const [camera_error, set_camera_error] = useState<string | null>(null);
  const [manual_code, set_manual_code] = useState("");
  const [producto, set_producto] = useState<ProductoEntrada | null>(null);
  const [sucursal_id, set_sucursal_id] = useState<number>(sucursales[0]?.id ?? 0);
  const [cantidad, set_cantidad] = useState("1");
  const [motivo, set_motivo] = useState("");
  const [scanner_open, set_scanner_open] = useState(false);
  const [is_pending, start_transition] = useTransition();

  const video_ref = useRef<HTMLVideoElement>(null);
  const last_code_ref = useRef<string | null>(null);
  const cooldown_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(
    (barcode: string) => {
      if (!barcode.trim()) return;
      if (barcode === last_code_ref.current) return;
      last_code_ref.current = barcode;
      set_estado("scanning");

      start_transition(async () => {
        const result = await buscar_producto_por_barcode(barcode);
        if (result) {
          set_producto(result);
          set_sucursal_id(result.inventario[0]?.sucursal_id ?? sucursales[0]?.id ?? 0);
          set_cantidad("1");
          set_motivo("");
          set_estado("found");
        } else {
          set_estado("not_found");
          cooldown_ref.current = setTimeout(() => {
            set_estado("idle");
            last_code_ref.current = null;
          }, 3000);
        }
      });
    },
    [sucursales],
  );

  // ZXing camera scanning
  useEffect(() => {
    if (!scanner_open) return;

    let controls: { stop: () => void } | null = null;
    let cancelled = false;
    set_camera_error(null);
    last_code_ref.current = null;

    import("@zxing/browser")
      .then(({ BrowserMultiFormatReader }) => {
        if (cancelled || !video_ref.current) return;
        const reader = new BrowserMultiFormatReader();
        reader
          .decodeFromVideoDevice(undefined, video_ref.current, (result, err) => {
            if (result) {
              buscar(result.getText());
            }
            if (err && err.name !== "NotFoundException") {
              console.error("[EntradaEscaner]", err);
            }
          })
          .then((c) => {
            if (cancelled) c.stop();
            else controls = c;
          })
          .catch((err: unknown) => {
            if (!cancelled) {
              set_camera_error(
                err instanceof Error && err.message.toLowerCase().includes("permission")
                  ? "Permiso de cámara denegado."
                  : "No se pudo acceder a la cámara.",
              );
            }
          });
      })
      .catch(() => {
        if (!cancelled) set_camera_error("Error al cargar el escáner.");
      });

    return () => {
      cancelled = true;
      controls?.stop();
      if (cooldown_ref.current) clearTimeout(cooldown_ref.current);
    };
  }, [scanner_open, buscar]);

  function handle_reset() {
    set_estado("idle");
    set_producto(null);
    set_manual_code("");
    last_code_ref.current = null;
    if (cooldown_ref.current) clearTimeout(cooldown_ref.current);
  }

  async function handle_restock(e: React.FormEvent) {
    e.preventDefault();
    if (!producto || !sucursal_id || !cantidad) return;

    const fd = new FormData();
    fd.set("producto_id", String(producto.id));
    fd.set("sucursal_id", String(sucursal_id));
    fd.set("cantidad", cantidad);
    fd.set("stock_minimo", String(producto.stock_minimo));
    fd.set("motivo", motivo || "Entrada de mercancía");

    start_transition(async () => {
      await restockProducto(fd);
      set_estado("success");
      // Auto-reset after 2.5s to allow another scan
      cooldown_ref.current = setTimeout(() => {
        handle_reset();
      }, 2500);
    });
  }

  const stock_sucursal =
    producto?.inventario.find((inv) => inv.sucursal_id === sucursal_id)?.stock_actual ?? null;

  return (
    <div className="space-y-6">
      {/* Controles de entrada */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Manual input */}
        <div className="flex-1">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Código de barras (manual)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={manual_code}
              onChange={(e) => set_manual_code(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buscar(manual_code);
                }
              }}
              placeholder="Escanea o escribe el código..."
              className="flex-1 rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
            />
            <button
              type="button"
              onClick={() => buscar(manual_code)}
              disabled={!manual_code.trim() || is_pending}
              className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-40"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Camera button */}
        <button
          type="button"
          onClick={() => set_scanner_open((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
            scanner_open
              ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
              : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-600"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M3 4a1 1 0 0 1 1-1h3a1 1 0 0 1 0 2H4v2a1 1 0 0 1-2 0V4Zm9-1a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V4h-2a1 1 0 0 1-1-1ZM4 14a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 0 0-2H4v-2a1 1 0 0 0-1-1Zm13 1a1 1 0 0 0-1-1 1 1 0 0 0-1 1v2h-2a1 1 0 0 0 0 2h3a1 1 0 0 0 1-1v-2ZM9 6a1 1 0 0 1 1 1v6a1 1 0 0 1-2 0V7a1 1 0 0 1 1-1Zm3 1a1 1 0 0 0-2 0v6a1 1 0 0 0 2 0V7Zm-6 0a1 1 0 0 0-2 0v6a1 1 0 0 0 2 0V7Z" clipRule="evenodd" />
          </svg>
          {scanner_open ? "Cerrar cámara" : "Abrir cámara"}
        </button>
      </div>

      {/* Camera view */}
      {scanner_open && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          {camera_error ? (
            <div className="px-4 py-6 text-center text-sm text-rose-300">{camera_error}</div>
          ) : (
            <div className="relative">
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="relative h-36 w-56">
                  <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-sky-400" />
                  <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-sky-400" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-sky-400" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-sky-400" />
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
              <p className="py-2 text-center text-xs text-slate-500">
                Apunta al código de barras del producto
              </p>
            </div>
          )}
        </div>
      )}

      {/* Feedback states */}
      {(estado === "scanning" || is_pending) && (
        <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-5 py-4 text-sm text-sky-300">
          Buscando producto...
        </div>
      )}

      {estado === "not_found" && (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-300">
          No se encontró producto con ese código. Verifica que el producto tenga código de barras registrado.
        </div>
      )}

      {estado === "success" && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-300">
          Stock agregado correctamente. Listo para escanear el siguiente producto.
        </div>
      )}

      {/* Product card + restock form */}
      {estado === "found" && producto && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          {/* Product info */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200/70">
                Producto encontrado
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">{producto.nombre}</h3>
              <p className="mt-0.5 text-sm text-slate-400">
                {producto.sku}
                {producto.codigo_barras && (
                  <span className="ml-3 text-slate-500">{producto.codigo_barras}</span>
                )}
              </p>
              <span className="mt-2 inline-block rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {producto.categoria}
              </span>
            </div>
            <button
              type="button"
              onClick={handle_reset}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Restock form */}
          <form onSubmit={handle_restock} className="space-y-4">
            {/* Sucursal selector */}
            {sucursales.length > 1 ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Sucursal destino
                </label>
                <select
                  value={sucursal_id}
                  onChange={(e) => set_sucursal_id(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                >
                  {sucursales.map((s) => {
                    const inv = producto.inventario.find((i) => i.sucursal_id === s.id);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.nombre} — stock actual: {inv?.stock_actual ?? 0}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <span className="text-slate-300">{sucursales[0]?.nombre}</span>
                <span className={`font-semibold ${
                  stock_sucursal === null
                    ? "text-slate-500"
                    : stock_sucursal <= 0
                      ? "text-rose-400"
                      : stock_sucursal <= producto.stock_minimo
                        ? "text-amber-300"
                        : "text-emerald-300"
                }`}>
                  Stock actual: {stock_sucursal ?? "—"}
                </span>
              </div>
            )}

            {/* Cantidad + motivo */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Cantidad a ingresar
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={cantidad}
                  onChange={(e) => set_cantidad(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Motivo <span className="normal-case text-slate-600">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={motivo}
                  onChange={(e) => set_motivo(e.target.value)}
                  placeholder="Compra a proveedor..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={is_pending || !cantidad || Number(cantidad) <= 0}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_pending ? "Registrando..." : `Ingresar ${cantidad || "?"} unidades`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
