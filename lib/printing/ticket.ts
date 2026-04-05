import type { MetodoPago } from "@prisma/client";

import { EscPos, PRINTER_WIDTH, PRINTER_WIDTHS } from "./escpos";
import type { PosCartItem } from "@/hooks/use-pos-store";

export type TicketData = {
  branch_name: string;
  folio?: string;
  operator_name?: string;
  operator_role?: string;
  items: PosCartItem[];
  total: number;
  metodo_pago: MetodoPago;
  monto_recibido?: number;
  cambio?: number;
  timestamp: string;
  width?: number;
};

function pad_right(s: string, len: number): string {
  return s.substring(0, len).padEnd(len);
}

function pad_left(s: string, len: number): string {
  return s.substring(0, len).padStart(len);
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function build_ticket(data: TicketData): Uint8Array {
  const pos = new EscPos().init();
  const W = data.width ?? PRINTER_WIDTHS[
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("erp_printer_width") ?? "58mm")
      : "58mm"
  ] ?? PRINTER_WIDTH;

  // ── Header ──────────────────────────────────────────────────────────────
  pos
    .align("center")
    .bold(true)
    .double_height(true)
    .text("ERP Multi-Sucursal")
    .feed()
    .double_height(false)
    .text(data.branch_name.substring(0, W))
    .feed()
    .bold(false)
    .align("left")
    .separator();

  // ── Folio + fecha ────────────────────────────────────────────────────────
  if (data.folio) {
    pos.text(`Folio: ${data.folio}`).feed();
  } else {
    pos.text("Ticket offline (pendiente de sync)").feed();
  }
  if (data.operator_name) {
    pos.text(`Atendio: ${data.operator_name.substring(0, W - 9)}`).feed();
    if (data.operator_role) {
      pos.text(`Rol: ${data.operator_role}`).feed();
    }
  }

  const d = new Date(data.timestamp);
  const date_str = d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time_str = d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  pos
    .text(`${date_str}  ${time_str}`)
    .feed()
    .text(`Items: ${data.items.length}`)
    .feed()
    .separator();

  // ── Columnas de items ────────────────────────────────────────────────────
  // Layout: [nombre 20] [qty 3] [total 8]  = 31 + 1 space = 32
  const NAME_W = W - 3 - 8 - 2;  // 19
  const QTY_W = 3;
  const AMT_W = 8;

  pos
    .bold(true)
    .text(
      pad_right("Producto", NAME_W) +
        " " +
        pad_left("Qty", QTY_W) +
        " " +
        pad_left("Total", AMT_W),
    )
    .feed()
    .bold(false)
    .separator();

  for (const item of data.items) {
    const subtotal = item.precio_unitario * item.cantidad;
    pos
      .text(
        pad_right(item.nombre, NAME_W) +
          " " +
          pad_left(String(item.cantidad), QTY_W) +
          " " +
          pad_left(fmt(subtotal), AMT_W),
      )
      .feed();

    if (item.cantidad > 1) {
      pos.text(pad_right(`  ${fmt(item.precio_unitario)} c/u`, W)).feed();
    }
  }

  pos.separator("=");

  // ── Total ────────────────────────────────────────────────────────────────
  const total_str = fmt(data.total);
  pos
    .bold(true)
    .double_height(true)
    .text("TOTAL".padEnd(W - total_str.length) + total_str)
    .feed()
    .double_height(false)
    .bold(false);

  const pago_labels: Record<MetodoPago, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
  };

  pos.text(`Pago: ${pago_labels[data.metodo_pago]}`).feed();

  if (data.metodo_pago === "efectivo" && data.monto_recibido !== undefined) {
    const recibido = fmt(data.monto_recibido);
    const cambio = fmt(data.cambio ?? 0);
    pos
      .text(`Recibido : ${recibido.padStart(W - 11)}`)
      .feed()
      .text(`Cambio   : ${cambio.padStart(W - 11)}`)
      .feed();
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  pos
    .separator()
    .align("center")
    .text("Gracias por su compra!")
    .feed()
    .text("Vuelva pronto")
    .feed(4)
    .cut();

  return pos.build();
}
