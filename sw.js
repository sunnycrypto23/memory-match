// ========== SERVICE WORKER ==========
const CACHE_NAME = 'memory-match-v1';
const ASSETS = [
  '/memory-match/',
  '/memory-match/index.html',
  '/memory-match/style.css',
  '/memory-match/app.js',
  '/memory-match/manifest.json',
  '/memory-match/icon-192.png',
  '/memory-match/icon-512.png'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        return cached || fetch(event.request)
          .then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return response;
          });
      })
      .catch(() => {
        return caches.match('/memory-match/index.html');
      })
  );
});

// Remove any message event listeners – we don't need them
// This avoids the "message event" warning
