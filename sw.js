/* Offline is the point, not a feature. Cache the shell, serve it, done. */
const CACHE = "tessera-console-v4";
const SHELL = ["./", "./index.html", "./app.js", "./manifest.webmanifest", "./assets/icon.svg",
               "./assets/icon-192.png", "./assets/icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  // Only the shell. A GET to the engine is a read of live data: caching it means
  // the first empty list is served forever, so a record you just created never
  // appears. That is exactly what happened, and it looked like the engine losing
  // writes.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match("./index.html")))
  );
});
