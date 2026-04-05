export const PRINTER_WIDTH_KEY = "erp_printer_width";
export type PrinterWidthOption = "58mm" | "80mm";

// Known Bluetooth GATT profiles for ESC/POS thermal printers
const PRINTER_PROFILES = [
  {
    // Most common generic serial profile (e.g. ZJ-5805, GOOJPRT, many Chinese brands)
    service: "000018f0-0000-1000-8000-00805f9b34fb",
    characteristic: "00002af1-0000-1000-8000-00805f9b34fb",
  },
  {
    // Peripage, Paperang and similar
    service: "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
    characteristic: "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
  },
  {
    // Sewoo, Star Micronics and compatible
    service: "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    characteristic: "49535343-8841-43f4-a8d4-ecbe34729bb3",
  },
];

export type PrinterConnection = {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
};

export async function connect_printer(): Promise<PrinterConnection> {
  if (!("bluetooth" in navigator)) {
    throw new Error(
      "Web Bluetooth no está disponible. Usa Chrome o Edge en Android/Desktop.",
    );
  }

  const service_uuids = PRINTER_PROFILES.map((p) => p.service);

  const device = await navigator.bluetooth.requestDevice({
    // Accept any device that exposes one of the known services
    filters: service_uuids.map((s) => ({ services: [s] })),
    optionalServices: service_uuids,
  });

  if (!device.gatt) {
    throw new Error("El dispositivo no tiene GATT disponible.");
  }

  const server = await device.gatt.connect();

  for (const profile of PRINTER_PROFILES) {
    try {
      const service = await server.getPrimaryService(profile.service);
      const characteristic = await service.getCharacteristic(
        profile.characteristic,
      );
      return { device, characteristic };
    } catch {
      // Profile not supported by this printer — try next
    }
  }

  device.gatt.disconnect();
  throw new Error(
    "Impresora conectada pero perfil ESC/POS no reconocido. Verifica el modelo.",
  );
}

// Try to silently reconnect to a previously paired printer (no picker shown).
// Uses navigator.bluetooth.getDevices() which is available in Chrome 85+.
export async function get_remembered_printer(): Promise<PrinterConnection | null> {
  if (!("bluetooth" in navigator)) return null;
  const bt = navigator.bluetooth as Bluetooth & {
    getDevices?: () => Promise<BluetoothDevice[]>;
  };
  if (typeof bt.getDevices !== "function") return null;

  let devices: BluetoothDevice[] = [];
  try {
    devices = await bt.getDevices();
  } catch {
    return null;
  }

  for (const device of devices) {
    if (!device.gatt) continue;
    try {
      const server = await device.gatt.connect();
      for (const profile of PRINTER_PROFILES) {
        try {
          const service = await server.getPrimaryService(profile.service);
          const characteristic = await service.getCharacteristic(profile.characteristic);
          return { device, characteristic };
        } catch {
          // profile not supported on this device
        }
      }
      device.gatt.disconnect();
    } catch {
      // device out of range or unavailable
    }
  }
  return null;
}

// Write data in chunks — GATT MTU is typically 512 bytes but 200 is safe
const CHUNK_SIZE = 200;

export async function print_bytes(
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
): Promise<void> {
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, offset + CHUNK_SIZE);
    // Prefer writeValueWithoutResponse for speed; fall back to writeValue
    const c = characteristic as BluetoothRemoteGATTCharacteristic & {
      writeValue?: (value: BufferSource) => Promise<void>;
    };
    if (typeof c.writeValueWithoutResponse === "function") {
      await c.writeValueWithoutResponse(chunk);
    } else if (typeof c.writeValue === "function") {
      await c.writeValue(chunk);
    }
    // Small delay between chunks to avoid buffer overflow on slow printers
    await new Promise((r) => setTimeout(r, 20));
  }
}
