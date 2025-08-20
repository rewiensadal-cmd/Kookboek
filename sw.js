const CACHE = 'kb-v19';
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './placeholder.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => (n !== CACHE) && caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // recipes.json → Network-first, cached fallback
  if (url.pathname.endsWith('/recipes.json')) {
    e.respondWith((async () => {
      try {
        const net = await fetch(e.request, { cache: 'no-store' });
        const cache = await caches.open(CACHE);
        cache.put(e.request, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(e.request);
        return cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  const isLocal = url.origin === location.origin;

  // App-shell assets → Cache-first
  if (isLocal && PRECACHE.some(p => url.pathname.endsWith(p.replace('./','/')))) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      return cached || fetch(e.request);
    })());
    return;
  }

  // Local images → Stale-while-revalidate
  if (isLocal && url.pathname.match(/\.(png|jpg|jpeg|webp|gif)$/i)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(r => (cache.put(e.request, r.clone()), r)).catch(()=>null);
      return cached || network || Response.error();
    })());
    return;
  }

  // Default: network with cache fallback
  e.respondWith((async () => {
    try { return await fetch(e.request); }
    catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(e.request);
      return cached || Response.error();
    }
  })());
});
