const DB_NAME = "erp-pos-offline";
const DB_VERSION = 1;
const STORE_VENTAS = "ventas_queue";

function open_db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        db.createObjectStore(STORE_VENTAS, {
          keyPath: "local_id",
          autoIncrement: true,
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idb_add<T>(data: Omit<T, "local_id">): Promise<number> {
  const db = await open_db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, "readwrite");
    const r = tx.objectStore(STORE_VENTAS).add(data);
    r.onsuccess = () => resolve(r.result as number);
    r.onerror = () => reject(r.error);
  });
}

export async function idb_get_all<T>(): Promise<T[]> {
  const db = await open_db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, "readonly");
    const r = tx.objectStore(STORE_VENTAS).getAll();
    r.onsuccess = () => resolve(r.result as T[]);
    r.onerror = () => reject(r.error);
  });
}

export async function idb_put<T extends { local_id: number }>(data: T): Promise<void> {
  const db = await open_db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, "readwrite");
    const r = tx.objectStore(STORE_VENTAS).put(data);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function idb_delete(local_id: number): Promise<void> {
  const db = await open_db();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VENTAS, "readwrite");
    const r = tx.objectStore(STORE_VENTAS).delete(local_id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}
