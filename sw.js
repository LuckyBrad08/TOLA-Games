/* Keeps Pip's Learning Garden working offline. The cache name changes with every update,
   so a new version is fetched the next time the app is opened with internet. */
const CACHE = "pip-garden-5d506ef10c";
const FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "fonts/fonts.css", "fonts/Andika-400-latin-ext.woff2", "fonts/Andika-400-latin.woff2", "fonts/Andika-700-latin-ext.woff2", "fonts/Andika-700-latin.woff2", "fonts/Baloo2-600-latin-ext.woff2", "fonts/Baloo2-600-latin.woff2", "fonts/Baloo2-800-latin-ext.woff2", "fonts/Baloo2-800-latin.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
