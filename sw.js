/* Offline shell for GitHub Pages at /sk-register/ — relative URLs stay inside that folder. */
const CACHE = "sk-register-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

async function putFresh(cache, url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) return;
  const headers = new Headers(res.headers);
  const body = await res.blob();
  await cache.put(url, new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map((url) => putFresh(cache, url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const path = new URL(req.url).pathname;
  if (path.endsWith("/sw.js")) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res.status === 200 && new URL(req.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(async (cache) => {
          const headers = new Headers(copy.headers);
          const body = await copy.blob();
          await cache.put(req, new Response(body, {
            status: copy.status,
            statusText: copy.statusText,
            headers
          }));
        }).catch(() => {});
      }
      return res;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        return (await caches.match("./index.html")) || (await caches.match("./")) || new Response("Offline", { status: 503 });
      }
      return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
  })());
});
