import { getProductos } from "@/actions/productos";
import { getPosLandingSummary } from "@/actions/pos-summary";
import { get_current_user } from "@/lib/auth/session";
import { get_current_db_user, get_current_operating_assignment, get_shift_assignable_sucursales } from "@/lib/auth/operating-context";
import { Cart } from "@/components/pos/cart";
import { ProductGrid } from "@/components/pos/product-grid";
import { FaltanteForm } from "@/components/pos/faltante-form";
import { BarcodeScanner } from "@/components/pos/barcode-scanner";
import { OfflineIndicator } from "@/components/pos/offline-indicator";
import { PinLogin } from "@/components/pos/pin-login";
import { ShiftCheckinCard } from "@/components/pos/shift-checkin-card";
import { OperatorLandingCard } from "@/components/pos/operator-landing-card";
import { CashboxCard } from "@/components/pos/cashbox-card";

export default async function PosPage() {
  const [db_user, user, operating_assignment, shift_options, landing_summary] = await Promise.all([
    get_current_db_user(),
    get_current_user(),
    get_current_operating_assignment(),
    get_shift_assignable_sucursales(),
    getPosLandingSummary(),
  ]);
  const branch_name =
    operating_assignment?.sucursal?.nombre ??
    db_user?.sucursal?.nombre ??
    (typeof user?.user_metadata?.sucursal_nombre === "string"
      ? user.user_metadata.sucursal_nombre
      : "Sin sucursal");
  const is_vendor_without_shift =
    (db_user?.rol === "vendedor" || db_user?.rol === "cajero") && !operating_assignment?.sucursal_id;

  if (
    !operating_assignment?.sucursal_id &&
    db_user?.rol !== "vendedor" &&
    db_user?.rol !== "cajero"
  ) {
    return (
      <div className="rounded-2xl p-6"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <h1 className="text-xl font-bold" style={{ color: "#f59e0b" }}>Sucursal requerida</h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "#a1a1aa" }}>
          Tu usuario no tiene una sucursal asignada. Antes de usar el POS,
          asigna una sucursal operativa desde configuración.
        </p>
      </div>
    );
  }

  const productos = operating_assignment?.sucursal_id
    ? await getProductos({ sucursal_id: operating_assignment.sucursal_id })
    : [];

  const product_options = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
  }));

  return (
    <div className="space-y-4">
      <OfflineIndicator />
      {landing_summary ? <OperatorLandingCard summary={landing_summary} /> : null}
      {db_user?.rol === "vendedor" || db_user?.rol === "cajero" ? (
        <ShiftCheckinCard
          attendance={
            operating_assignment?.asistencia
              ? {
                  sucursal_nombre: operating_assignment.sucursal?.nombre ?? "Sin sucursal",
                  hora_entrada: operating_assignment.asistencia.hora_entrada.toISOString(),
                  hora_salida: operating_assignment.asistencia.hora_salida?.toISOString() ?? null,
                  estado: operating_assignment.asistencia.estado,
                }
              : null
          }
          sucursales={shift_options.sucursales}
        />
      ) : null}
      {landing_summary ? (
        <CashboxCard
          caja={landing_summary.caja}
          asistencia_activa={landing_summary.asistencia_activa}
          historial_cierres={landing_summary.historial_cierres}
        />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <PinLogin />
        {!is_vendor_without_shift && (
          <div className="flex gap-2">
            <BarcodeScanner />
            <FaltanteForm productos={product_options} />
          </div>
        )}
      </div>
      {is_vendor_without_shift ? (
        <div className="rounded-2xl p-6"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <h1 className="text-xl font-bold" style={{ color: "#f59e0b" }}>Registra tu llegada</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "#a1a1aa" }}>
            Antes de vender o reportar faltantes, selecciona la sucursal donde trabajas hoy.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1.45fr_0.7fr]">
          <ProductGrid productos={productos} />
          <Cart
            branch_name={branch_name}
            default_operator={
              db_user
                ? {
                    nombre: db_user.nombre,
                    rol: db_user.rol,
                  }
                : null
            }
          />
        </div>
      )}
    </div>
  );
}
