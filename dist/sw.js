// Offline support for the Fire Panel Trainer.
//
// A GitHub Pages address hosts several apps and CacheStorage is shared per
// ORIGIN, not per app. So this worker only ever touches caches whose name
// starts with PREFIX; deleting "every cache except mine" would wipe the other
// installed apps' offline copies.
const PREFIX = 'fire-panel-trainer-';
const CACHE = PREFIX + '25619cb556';
const SHELL = ["./",".nojekyll","app.css","app.js","fonts/inter-latin-400-normal.woff2","fonts/inter-latin-500-normal.woff2","fonts/inter-latin-600-normal.woff2","fonts/inter-latin-700-normal.woff2","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","index.html","manifest.webmanifest"];
const NET_TIMEOUT = 3500; // slow ship internet: fall back to the offline copy

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const results = await Promise.allSettled(SHELL.map(async u => {
      const res = await fetch(u, { cache: 'reload' });
      if (!res.ok) throw new Error(u);
      await c.put(u, res);
    }));
    // A half-built cache must not replace a working one.
    if (results.some(r => r.status === 'rejected')) {
      await caches.delete(CACHE);
      throw new Error('precache incomplete, keeping the previous version');
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    // Only our own older versions. Never another app's cache.
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

// Network first (newest version when online) with a short timeout, then the offline copy.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const offline = async () =>
      (await cache.match(req, { ignoreSearch: true })) || (isPage ? (await cache.match('index.html')) || (await cache.match('./')) : undefined);
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    try {
      return await Promise.race([net, timeout(NET_TIMEOUT)]);
    } catch {
      const hit = await offline();
      if (hit) return hit;
      try { return await net; } catch { return Response.error(); } // nothing cached: wait for the network
    }
  })());
});
