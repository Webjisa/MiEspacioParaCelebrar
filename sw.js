/* PWA shell support: network-first, no stale cache of Supabase-backed screens. */
self.addEventListener("install", function (event) {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  // Always use the live page/assets; do not cache personal data or booking states.
  event.respondWith(fetch(event.request));
});
