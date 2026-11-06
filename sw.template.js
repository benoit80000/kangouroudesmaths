/* Service worker de Kangourou des maths : l'appli fonctionne sans connexion.
   Généré au build par vite.config.js (VERSION et PRECACHE sont remplacés). */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const APP_CACHE = `kangourou-app-${VERSION}`;
const FIGURES_CACHE = 'kangourou-figures';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kangourou-app-') && k !== APP_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put('./index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // La page : toujours la dernière version en ligne, la copie locale sinon.
    if (url.pathname.endsWith('/kangourou-app.html')) return;
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.includes('/exercises/')) {
    // Les figures ne changent jamais : gardées après la première consultation.
    event.respondWith(cacheFirst(request, FIGURES_CACHE));
  } else {
    event.respondWith(cacheFirst(request, APP_CACHE));
  }
});
