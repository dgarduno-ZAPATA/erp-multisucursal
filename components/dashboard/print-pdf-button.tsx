"use client";

export function PrintPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
