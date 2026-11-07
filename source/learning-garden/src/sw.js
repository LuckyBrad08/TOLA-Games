/* Keeps Pip's Learning Garden working offline, and up to date when online.
   - The app page itself: try the internet first (up to 4 seconds), so a new version shows straight away;
     use the saved copy when offline.
   - Everything else (fonts, icons): the saved copy, since those rarely change.
   The cache name changes with every update, so old copies are cleared out. */
const CACHE = "pip-garden-__VERSION__";
const FILES = __FILES__;

self.addEventListener("install", e => {
  // cache: "reload" skips the browser's own short-term cache, so an update never saves the old files again
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  if (e.request.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await Promise.race([
          fetch(e.request, { cache: "no-cache" }),
          new Promise((_, no) => setTimeout(() => no(new Error("slow")), 4000))
        ]);
        if (fresh.ok) { cache.put("./", fresh.clone()); return fresh; }
      } catch (err) {}
      return (await cache.match("./")) || (await cache.match("index.html")) || fetch(e.request);
    })());
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request)));
});
