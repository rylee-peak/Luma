const CACHE_NAME = 'luma-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
  // Note: Once you create app icons, add their file paths here (e.g., '/icon-192.png')
];

// 1. Install Event: When the service worker is registered, cache the core files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// 2. Activate Event: Clean up any old caches if the CACHE_NAME changes.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the service worker takes control of the page immediately.
  self.clients.claim();
});

// 3. Fetch Event: Network-First strategy with a Cache Fallback.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests for our own origin.
  // We skip cross-origin requests (like Firebase API calls or CDNs) so we don't accidentally cache dynamic database data.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If the network is successful, update the cache with the fresh response
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return networkResponse;
      })
      .catch(() => {
        // If the network fails (user is offline), try to serve the file from the cache
        console.log('[Service Worker] Network failed, serving from cache:', event.request.url);
        return caches.match(event.request);
      })
  );
});
