/* ASVAB Coach service worker: cache the app so it works offline after the first load. */
const CACHE = 'asvab-coach-v5';   // bump on every release so old installs update
const STATE = 'asvab-state';   // reminder settings written by the page
const FILES = ['./', 'index.html', 'styles.css', 'mathspeech.js', 'app.js', 'ladder.js', 'ladder_ui.js', 'audio.js', 'features.js', 'earlessons.js', 'pcreal.js', 'handsfree.js', 'questions.js', 'questions.json', 'tutor_rules.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'asvab-coach.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== STATE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
// Daily reminder when the app is closed (periodic background sync, where the browser supports it; best effort).
async function remindCheck(){
  const c = await caches.open(STATE); const r = await c.match('./reminder-state'); if (!r) return;
  const st = await r.json(); const d = new Date(); const day = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [h, m] = String(st.time || '18:00').split(':').map(Number);
  if (!st.on || st.goalDate === day || st.notified === day || d.getHours()*60 + d.getMinutes() < h*60 + m) return;
  st.notified = day; await c.put('./reminder-state', new Response(JSON.stringify(st), { headers:{ 'content-type':'application/json' } }));
  await self.registration.showNotification('ASVAB Coach', { body:'Time to study. Ten minutes keeps your streak.', icon:'icon-192.png', tag:'asvab-reminder', data:{ url:'./#plan' } });
}
self.addEventListener('periodicsync', e => { if (e.tag === 'asvab-reminder') e.waitUntil(remindCheck().catch(() => {})); });
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './#plan';
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    const w = list.find(x => 'focus' in x); if (w){ w.navigate && w.navigate(url).catch(() => {}); return w.focus(); }
    return self.clients.openWindow(url); }));
});
