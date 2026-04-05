"use client";

import { useState } from "react";

import { CreateOrdenForm } from "@/components/proveedores/create-orden-form";
import { RecibirOrdenForm } from "@/components/proveedores/recibir-orden-form";
import { RegistrarPagoForm } from "@/components/proveedores/registrar-pago-form";

type Detalle = {
  id: number;
  producto_id: number;
  cantidad_pedida: number;
  cantidad_recibida: number;
  precio_unitario: number;
  subtotal: number;
  producto: { nombre: string; sku: string };
};

type Pago = {
  id: number;
  monto: number;
  metodo_pago: string;
  fecha_pago: string;
  notas: string | null;
};

type Orden = {
  id: number;
  folio: string;
  estado: string;
  total: number;
  monto_pagado: number;
  saldo: number;
  vencida: boolean;
  fecha_esperada: string | null;
  fecha_recibida: string | null;
  fecha_vencimiento: string | null;
  notas: string | null;
  sucursal: { nombre: string };
  receptor: { nombre: string } | null;
  detalle: Detalle[];
  pagos: Pago[];
};

type Sucursal = { id: number; nombre: string };
type Producto = { id: number; nombre: string; sku: string };

type Props = {
  proveedor_id: number;
  proveedor_nombre: string;
  monto_minimo?: number | null;
  ordenes: Orden[];
  sucursales: Sucursal[];
  productos: Producto[];
};

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function EstadoBadge({ estado, vencida }: { estado: string; vencida: boolean }) {
  const map: Record<string, string> = {
    pendiente: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    recibida: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    recibida_parcial: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    cancelada: "border-slate-500/30 bg-slate-500/10 text-slate-400",
  };
  const labels: Record<string, string> = {
    pendiente: vencida ? "⚠ Vencida" : "Pendiente",
    recibida: "Recibida",
    recibida_parcial: "Parcial",
    cancelada: "Cancelada",
  };
  const cls = vencida && estado === "pendiente"
    ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
    : (map[estado] ?? map.pendiente);

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

export function OrdenesPanel({ proveedor_id, proveedor_nombre, monto_minimo, ordenes, sucursales, productos }: Props) {
  const [recibiendo, setRecibiendo] = useState<number | null>(null);
  const [pagando, setPagando] = useState<number | null>(null);
  const [expandida, setExpandida] = useState<number | null>(null);

  const orden_recibiendo = ordenes.find((o) => o.id === recibiendo);
  const orden_pagando = ordenes.find((o) => o.id === pagando);

  return (
    <div className="space-y-4">
      <CreateOrdenForm
        proveedor_id={proveedor_id}
        sucursales={sucursales}
        productos={productos}
        monto_minimo={monto_minimo}
      />

      {orden_recibiendo && (
        <RecibirOrdenForm
          orden_id={orden_recibiendo.id}
          folio={orden_recibiendo.folio}
          proveedor_nombre={proveedor_nombre}
          detalle={orden_recibiendo.detalle}
          onClose={() => setRecibiendo(null)}
        />
      )}

      {orden_pagando && (
        <RegistrarPagoForm
          orden_id={orden_pagando.id}
          folio={orden_pagando.folio}
          saldo={orden_pagando.saldo}
          onClose={() => setPagando(null)}
        />
      )}

      {ordenes.length === 0 ? (
        <p className="text-sm text-slate-400">Sin órdenes de compra todavía.</p>
      ) : (
        <div className="space-y-3">
          {ordenes.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-white/10 bg-slate-900/40 p-4"
            >
              {/* Cabecera orden */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setExpandida(expandida === o.id ? null : o.id)}
                  className="font-mono text-sm font-semibold text-white hover:text-sky-300"
                >
                  {o.folio}
                </button>
                <EstadoBadge estado={o.estado} vencida={o.vencida} />
                <span className="text-xs text-slate-400">{o.sucursal.nombre}</span>
                {o.fecha_esperada && (
                  <span className="text-xs text-slate-400">Esperado: {o.fecha_esperada}</span>
                )}
                {o.fecha_vencimiento && (
                  <span className={`text-xs ${o.vencida ? "text-rose-400" : "text-slate-400"}`}>
                    Vence: {o.fecha_vencimiento}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{currency.format(o.total)}</p>
                    {o.saldo > 0 && (
                      <p className="text-xs text-amber-300">Saldo: {currency.format(o.saldo)}</p>
                    )}
                  </div>
                  {o.estado === "pendiente" && (
                    <button
                      onClick={() => setRecibiendo(o.id)}
                      className="rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Recibir
                    </button>
                  )}
                  {o.saldo > 0 && o.estado !== "cancelada" && (
                    <button
                      onClick={() => setPagando(o.id)}
                      className="rounded-xl bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/30"
                    >
                      Pagar
                    </button>
                  )}
                </div>
              </div>

              {/* Detalle expandible */}
              {expandida === o.id && (
                <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                  {/* Productos */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Productos
                    </p>
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="pb-1 pr-4 text-left">Producto</th>
                          <th className="pb-1 pr-4 text-right">Pedido</th>
                          <th className="pb-1 pr-4 text-right">Recibido</th>
                          <th className="pb-1 pr-4 text-right">Precio</th>
                          <th className="pb-1 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.detalle.map((d) => (
                          <tr key={d.id} className="border-t border-white/5">
                            <td className="py-1.5 pr-4 text-slate-200">{d.producto.nombre}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-300">{d.cantidad_pedida}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-300">{d.cantidad_recibida}</td>
                            <td className="py-1.5 pr-4 text-right text-slate-300">
                              {currency.format(d.precio_unitario)}
                            </td>
                            <td className="py-1.5 text-right text-slate-200">{currency.format(d.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagos */}
                  {o.pagos.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Pagos registrados
                      </p>
                      <div className="space-y-1">
                        {o.pagos.map((pago) => (
                          <div key={pago.id} className="flex items-center justify-between text-xs text-slate-300">
                            <span>{pago.fecha_pago} · {pago.metodo_pago}</span>
                            {pago.notas && <span className="text-slate-500">{pago.notas}</span>}
                            <span className="font-semibold text-emerald-300">
                              {currency.format(pago.monto)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {o.receptor && (
                    <p className="text-xs text-slate-500">
                      Recibido por: {o.receptor.nombre} · {o.fecha_recibida}
                    </p>
                  )}
                  {o.notas && <p className="text-xs text-slate-500">Notas: {o.notas}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
