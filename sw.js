/* ============================================================================
   Service Worker
   App-Shell wird beim ersten Besuch gecacht – danach funktioniert die App auch
   offline. Bei der Version unten hochzählen, wenn Dateien geändert wurden.
   ========================================================================== */

const CACHE_NAME = 'intervallfasten-v2';

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
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        // addAll bricht komplett ab, wenn eine Datei fehlt – daher einzeln.
        return Promise.all(
          APP_SHELL.map(function (url) {
            return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return key === CACHE_NAME ? null : caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;

  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Seitenaufrufe: erst Netzwerk (frische Version), sonst Cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('./index.html', copy);
          });
          return response;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (cached) {
            return cached || caches.match('./');
          });
        })
    );
    return;
  }

  // Übrige Dateien: sofort aus dem Cache, im Hintergrund aktualisieren.
  event.respondWith(
    caches.match(request).then(function (cached) {
      const network = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || network;
    })
  );
});
