const CACHE_VERSION = "v2";
const STATIC_CACHE = `erp-static-${CACHE_VERSION}`;
const PAGE_CACHE = `erp-pages-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, PAGE_CACHE];

const PRECACHE_STATIC = [
  "/manifest.json",
  "/icons/icon.svg",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-192x192-maskable.png",
  "/icons/icon-512x512-maskable.png",
];
const OFFLINE_PAGES = ["/pos"];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_STATIC).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (url.origin !== self.location.origin || request.method !== "GET") return;

  // Skip API routes — handled fully by client JS
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (Next.js chunks, icons, manifest): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cache_first(request, STATIC_CACHE));
    return;
  }

  // Next.js image optimization: network-first, no cache (dynamic)
  if (url.pathname.startsWith("/_next/image")) return;

  // Navigation requests for POS: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(network_first_page(request));
    return;
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function cache_first(request, cache_name) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cache_name);
    cache.put(request, response.clone());
  }
  return response;
}

async function network_first_page(request) {
  const url = new URL(request.url);
  const is_pos = OFFLINE_PAGES.some(
    (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
  );

  try {
    const response = await fetch(request);
    if (response.ok && is_pos) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback: serve cached POS page for any offline navigation
    if (is_pos) {
      const pos_cached = await caches.match("/pos");
      if (pos_cached) return pos_cached;
    }
    return new Response(
      `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión — ERP</title><style>body{font-family:system-ui,sans-serif;background:#020617;color:#94a3b8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}.card{background:#0f172a;border:1px solid #1e293b;border-radius:1.5rem;padding:2.5rem;max-width:22rem}h1{color:#fff;font-size:1.5rem;margin:0 0 0.75rem}p{margin:0 0 1.5rem;font-size:.875rem}a{color:#38bdf8;text-decoration:none;font-weight:600}</style></head><body><div class="card"><h1>Sin conexión</h1><p>Esta página no está disponible sin internet. Visita el POS primero para habilitarla offline.</p><a href="/pos">Ir al POS</a></div></body></html>`,
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

// ─── Messages ────────────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
