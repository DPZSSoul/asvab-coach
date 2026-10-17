/* ASVAB Coach service worker: cache the app so it works offline after the first load. */
const CACHE = 'asvab-coach-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'questions.js', 'questions.json', 'tutor_rules.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'asvab-coach.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // stale-while-revalidate: answer from cache right away, refresh the cache in the background
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (e.request.mode === 'navigate' ? c.match('index.html') : new Response('Offline', { status: 503 }));
  }));
});
