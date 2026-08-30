// ========== SERVICE WORKER ==========
const CACHE_NAME = 'memory-match-v1';
const ASSETS = [
  '.',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
];

// Install – cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate – clean old caches
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

// Fetch – serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // Return cached version if found, otherwise fetch from network
        return cached || fetch(event.request)
          .then((response) => {
            // Cache new responses for future
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
            return response;
          });
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        return caches.match('index.html');
      })
  );
});