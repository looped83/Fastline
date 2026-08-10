/* ============================================================================
   Service Worker
   ----------------------------------------------------------------------------
   Die App-Shell wird bei der Installation einmal vollständig gecacht und
   danach ausschließlich von dort ausgeliefert. Im laufenden Betrieb entsteht
   dadurch kein Netzverkehr mehr – die App startet offline wie online sofort.

   Aktualisiert wird über die Version: CACHE_NAME hochzählen, sobald sich
   Dateien geändert haben. Der Browser prüft sw.js bei jedem Aufruf, installiert
   die neue Fassung, lädt die Shell frisch und wirft den alten Cache weg.
   ========================================================================== */

const CACHE_NAME = 'intervallfasten-v15';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './settings.js',
  './fasting.js',
  './app.js',
  './manifest.webmanifest',
  './icons/favicon.svg',
  // Nur die tatsächlich eingebundenen Icons. Kommt eine Datei hinzu, gehört
  // sie hier hinein, sonst fehlt sie offline.
  './icons/icon-192-dark.png',
  './icons/icon-512-dark.png',
  './icons/icon-maskable-512-dark.png',
  './icons/apple-touch-icon-dark.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // Einzeln statt addAll: eine fehlende Datei soll nicht die ganze
      // Installation scheitern lassen.
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
        })
      );
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          return key === CACHE_NAME ? null : caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  // sw.js selbst nie ausliefern, sonst blockiert der Cache seine eigene
  // Aktualisierung.
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE_NAME);

  // Die Shell liegt vollständig im Cache – normalerweise endet es hier.
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline und nichts im Cache: bei Seitenaufrufen die Shell ausliefern.
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return Response.error();
  }
}
