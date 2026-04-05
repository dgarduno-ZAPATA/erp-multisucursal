import { PrinterSetup } from "@/components/configuracion/printer-setup";
import { require_roles } from "@/lib/auth/rbac";

export default async function ConfiguracionImpresoraPage() {
  await require_roles(["admin"]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">
          Configuracion
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Impresora termica
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Parear la impresora Bluetooth con esta tablet. Una sola vez por dispositivo.
          Compatible con Epson TM, Xprinter, MUNBYN, Goojprt y cualquier impresora ESC/POS BT.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.75)]">
        <h2 className="mb-6 text-lg font-semibold tracking-tight text-white">
          Conexion Bluetooth
        </h2>
        <div className="max-w-md">
          <PrinterSetup />
        </div>
      </section>
    </div>
  );
}
