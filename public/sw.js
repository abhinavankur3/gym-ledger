// Bump to purge caches written by older workers.
const CACHE_NAME = "kochi-v1";
const STATIC_ASSETS = ["/icon-192x192.png", "/icon-512x512.png", "/icon-maskable-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Cache-first only for immutable assets: content-hashed build output and app icons.
  // Anything else could change under the same URL and must not be served stale.
  const url = new URL(request.url);
  const immutable =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname));
  if (immutable) {
    event.respondWith(
      caches
        .match(request)
        .then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
              }
              return res;
            })
        )
    );
    return;
  }

  // Network-first for navigation and API requests
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
