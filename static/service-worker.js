const cacheName = 'flask-PWA-v1';
const staticcache = 'css-cache'
const filesToCache = [
    '/',
    '/static/app.js',
    '/index',
    '/upload/',
    '/gallery/',
    'http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css',
'http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js'
    
];
const staticfiles = ['http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css',
'http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js'
];

self.addEventListener('install', (e) => {
    console.log('[ServiceWorker] Install');
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        console.log('[ServiceWorker] Caching app shell');
        await cache.addAll(filesToCache);
        const cache2 = await caches.open(staticcache);
        console.log('[ServiceWorker] Caching app shell');
        await cache2.addAll(staticfiles);
    })());
});

self.addEventListener('activate', (e) => {
    console.log('[ServiceWorker] Activate');
    e.waitUntil((async () => {
        const cacheKeys = await caches.keys();
        cacheKeys.map(async (key) => {
            if (key !== cacheName) {
                console.log('[ServiceWorker] Removing old cache', key);
                await caches.delete(key);
            }
        });
        const cache = await caches.open(cacheName);
        console.log('[ServiceWorker] Updating cache');
        await cache.addAll(filesToCache);
    })());
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method === 'POST'&& e.request.url.includes('/upload')) {
        // Exclude handling redirects for POST requests
        return;
      }
      if (e.request.method === 'GET'&& e.request.url.includes('/logout')) {
        // Exclude handling redirects for POST requests
        return;
      }
      if (e.request.method === 'POST'&& e.request.url.includes('/delete')) {
        // Exclude handling redirects for POST requests
        return;
      }
    console.log('[ServiceWorker] Fetch', e.request.url);
    e.respondWith((async () => {
        const cacheResponse = await caches.match(e.request);
        if (cacheResponse) {
            console.log('[ServiceWorker] Cache hit:', e.request.url);
            return cacheResponse;
        }

        try {
            const fetchResponse = await fetch(e.request);
            if (fetchResponse.ok) {
              // Clone the response since it can only be consumed once
              const clonedResponse = fetchResponse.clone();
              const cache = await caches.open(cacheName);
              console.log('[ServiceWorker] Caching new resource:', e.request.url);
              cache.put(e.request, clonedResponse);
              return fetchResponse;
            }
          } catch (error) {
            console.log('[ServiceWorker] Fetch failed; returning offline page instead.', error);
          }
        // If the request is for an image in the "/static/uploads" directory,
        // serve a fallback image or offline image
        const requestUrl = new URL(e.request.url);
        if (requestUrl.pathname.startsWith('/static/uploads')) {
            return caches.match('/static/fallback-image.jpg');
        }
        if (requestUrl.pathname.startsWith('/upload') || requestUrl.pathname.startsWith('/gallery') || requestUrl.pathname.startsWith('/index')) {
            // Serve the request from the static cache
            const staticCacheResponse = await caches.match(e.request, { cacheName: staticcache });
            if (staticCacheResponse) {
                console.log('[ServiceWorker] Static Cache hit:', e.request.url);
                return staticCacheResponse;
            }
        }

        // For other requests, return an offline page
        return caches.match('/offline.html');
    })());
});
self.addEventListener('message', (e) => {
    if (e.data.action === 'clearCache') {
        caches.keys().then((cacheNames) => {
          cacheNames.forEach((cacheName) => {
            if (cacheName.startsWith('flask-PWA-v1')) {
              if (cacheName.startsWith('flask-PWA-v1/static/uploads') || cacheName === 'flask-PWA-v1/gallery-html') {
                caches.delete(cacheName);
                console.log('[ServiceWorker] Deleted cache:', cacheName);
              }
            }
          });
        });
        e.waitUntil((async () => {
            const cache = await caches.open(cacheName);
            console.log('[ServiceWorker] recaching');
            await cache.addAll(filesToCache);
        })());
    }
    
});
