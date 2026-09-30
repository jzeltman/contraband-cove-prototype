const CACHE = 'contraband-cove-v0.1.1';
const ROOT = new URL('./', self.location).href;
const FILES = ['','index.html','styles.css','src/app.js','src/game.js','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png',...['inspection-dock','inspection-desk','harbor-overview','berth-upgrade','mara-neutral','mara-pleased','merchant-captain','weathered-sailor','well-dressed-trader','wooden-crate','cloth-bundle','trade-chest','scale-stand','scale-beam','scale-pan','reference-weight'].map(n => `assets/art/runtime/${n}.webp`)];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(p => new URL(p, ROOT).href)))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('contraband-cove-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(ROOT)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(event.request, { ignoreSearch: true });
    if (saved) return saved;
    try { return await fetch(event.request); }
    catch (err) { if (event.request.mode === 'navigate') return cache.match(new URL('index.html', ROOT).href); throw err; }
  }));
});
