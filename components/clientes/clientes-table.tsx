"use client";

import { useState } from "react";
import Link from "next/link";

import type { ClienteRow } from "@/actions/clientes";

type ClientesTableProps = {
  clientes: ClienteRow[];
};

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const DATE = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function ltv_tier(ltv: number): { label: string; class: string } {
  if (ltv >= 10000) return { label: "VIP", class: "text-amber-300 bg-amber-400/10 border-amber-400/20" };
  if (ltv >= 3000) return { label: "Frecuente", class: "text-sky-300 bg-sky-400/10 border-sky-400/20" };
  if (ltv >= 500) return { label: "Regular", class: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" };
  return { label: "Nuevo", class: "text-slate-400 bg-slate-800 border-slate-700" };
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  const [query, set_query] = useState("");

  const normalized = query.trim().toLowerCase();
  const visible =
    normalized.length < 2
      ? clientes
      : clientes.filter(
          (c) =>
            c.nombre.toLowerCase().includes(normalized) ||
            (c.email?.toLowerCase().includes(normalized) ?? false) ||
            (c.telefono?.includes(normalized) ?? false),
        );

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
      {/* Search */}
      <div className="mb-5">
        <input
          type="search"
          value={query}
          onChange={(e) => set_query(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
        />
        {normalized.length === 1 && (
          <p className="mt-1 text-xs text-slate-600">Escribe al menos 2 caracteres.</p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-sm text-slate-500">
          {clientes.length === 0
            ? "Sin clientes registrados. Crea el primero."
            : `Sin resultados para "${query}".`}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold text-center">Compras</th>
                <th className="px-4 py-3 font-semibold text-right">LTV</th>
                <th className="px-4 py-3 font-semibold">Última compra</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => {
                const tier = ltv_tier(c.ltv);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-300">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{c.nombre}</div>
                          <span
                            className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${tier.class}`}
                          >
                            {tier.label}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-300">{c.email ?? "—"}</div>
                      <div className="text-xs text-slate-500">{c.telefono ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-xl bg-slate-800 px-2 py-1 text-sm font-semibold text-slate-300">
                        {c.total_compras}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                      {currency.format(c.ltv)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.ultima_compra ? DATE.format(new Date(c.ultima_compra)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="rounded-xl border border-slate-700 bg-transparent px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-right text-xs text-slate-600">
        {visible.length} de {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
      </p>
    </section>
  );
}
