// Service worker de Nouvel Élan.
// À chaque publication, incrémenter CACHE_VERSION pour proposer la mise à jour.
// Le cache ne contient que les fichiers de l'application : les données (IndexedDB) ne sont jamais touchées.
const CACHE_VERSION = 'v2.0.1';
const CACHE = 'nouvel-elan-' + CACHE_VERSION;
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/config.js', './js/util.js', './js/db.js', './js/state.js', './js/io.js', './js/router.js', './js/platform.js',
  './js/data/exercises.js', './js/data/programs.js',
  './js/engine/calories.js', './js/engine/stats.js', './js/engine/program.js', './js/engine/suggest.js', './js/engine/companion.js',
  './js/companion/art.js', './js/companion/wardrobe.js', './js/companion/view.js',
  './js/ui/components.js', './js/ui/charts.js',
  './js/views/common.js', './js/views/home.js', './js/views/session.js', './js/views/history.js', './js/views/progress.js',
  './js/views/profiles.js', './js/views/attention.js', './js/views/program.js', './js/views/activity.js',
  './js/views/measures.js', './js/views/settings.js', './js/views/exercises.js', './js/views/companion.js', './js/views/add.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('nouvel-elan-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('./index.html', { ignoreSearch: true });
      if (cached) return cached;
      return fetch(req);
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') {
      const c = await caches.open(CACHE);
      c.put(req, res.clone());
    }
    return res;
  })());
});
