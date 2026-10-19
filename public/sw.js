// LED 3D PWA Service Worker
const CACHE_NAME = 'led3d-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/demo',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
  '/manifest.json'
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    })
  );
});

// Activate: clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch: network first with cache fallback for HTML, cache first for static images
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip API, sockets, or admin requests from being aggressively cached
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // Static images and icons: Stale-While-Revalidate
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Navigation / HTML pages: Network First, Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful page response
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/demo');
          });
        })
    );
  }
});
