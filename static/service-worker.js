const cacheName = 'flask-PWA-v1';
const filesToCache = [
    '/',
    '/static/app.js',
    '/index',
    '/upload/',
    '/gallery/',
    'http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css',
    'http://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js'
];

self.addEventListener('install', (e) => {
    console.log('[ServiceWorker] Install');
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        console.log('[ServiceWorker] Caching app shell');
        await cache.addAll(filesToCache);
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
    })());
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
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

        // For other requests, return an offline page
        return caches.match('/offline.html');
    })());
});
