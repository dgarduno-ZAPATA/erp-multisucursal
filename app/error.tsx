"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  const detail = error.digest ? `${error.message}\nDigest: ${error.digest}` : error.message;

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
          Error de aplicacion
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          La vista no se pudo cargar
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Puedes intentar recargar esta seccion. Si vuelve a pasar, el detalle tecnico aparece abajo.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-200">
          {detail}
        </pre>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex items-center justify-center rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
        >
          Reintentar
        </button>
        {error.digest ? (
          <p className="mt-3 text-xs text-slate-500">
            Comparte este digest si vuelve a fallar: <span className="font-semibold text-slate-700">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
