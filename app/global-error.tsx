"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="es">
      <body className="bg-slate-100 text-slate-950">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
              Error global
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              La aplicacion necesita recargarse
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Next detecto un error en tiempo de ejecucion. Intenta recargar para reconstruir la vista.
            </p>
            <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-200">
              {error.message}
            </pre>
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            >
              Recargar aplicacion
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
