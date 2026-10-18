/* ASVAB Coach service worker: cache the app so it works offline after the first load. */
const CACHE = 'asvab-coach-v3';   // bump on every release so old installs update
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'ladder.js', 'ladder_ui.js', 'handsfree.js', 'questions.js', 'questions.json', 'tutor_rules.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'asvab-coach.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // network-first: always try the newest files; use the cache only when offline
  e.respondWith(caches.open(CACHE).then(async c => {
    try {
      const r = await fetch(e.request, { cache: 'no-cache' });
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      const hit = await c.match(e.request, { ignoreSearch: true });
      return hit || (e.request.mode === 'navigate' ? c.match('index.html') : new Response('Offline', { status: 503 }));
    }
  }));
});
