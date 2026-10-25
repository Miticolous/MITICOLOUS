const CACHE = 'revhunter-leve-v1';
const ASSETS = ['/', '/index.html', '/app.js', '/manifest.json', '/favicon.svg', '/servers.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((r) =>
      r || fetch(e.request).then((res) => {
        const c = res.clone();
        caches.open(CACHE).then((x) => x.put(e.request, c));
        return res;
      }).catch(() => r)
    )
  );
});