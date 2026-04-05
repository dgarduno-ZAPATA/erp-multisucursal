import { createCliente } from "@/actions/clientes";
import { require_roles } from "@/lib/auth/rbac";

type NuevoClientePageProps = {
  searchParams?: { error?: string };
};

export default async function NuevoClientePage({ searchParams }: NuevoClientePageProps) {
  await require_roles(["admin", "gerente"]);
  const error = searchParams?.error;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          CRM
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Nuevo cliente
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Registra un cliente para vincular compras y calcular su LTV automáticamente.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <form action={createCliente} className="space-y-5 max-w-xl">
          {/* Nombre */}
          <div>
            <label
              htmlFor="nombre"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
            >
              Nombre *
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Juan García"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
            />
          </div>

          {/* Email + Teléfono */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Email <span className="normal-case text-slate-600">(opcional)</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="juan@email.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
              />
            </div>
            <div>
              <label
                htmlFor="telefono"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
              >
                Teléfono <span className="normal-case text-slate-600">(opcional)</span>
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                placeholder="555 123 4567"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label
              htmlFor="direccion"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
            >
              Dirección <span className="normal-case text-slate-600">(opcional)</span>
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              placeholder="Calle, número, colonia..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/40 focus:ring-2 focus:ring-sky-400/10"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <a
              href="/clientes"
              className="flex-1 rounded-2xl border border-slate-700 bg-transparent py-3 text-center text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-sky-400 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Crear cliente
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
