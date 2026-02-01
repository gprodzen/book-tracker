/**
 * Service Worker - Offline support and caching strategies
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `book-tracker-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `book-tracker-dynamic-${CACHE_VERSION}`;
const COVER_CACHE = `book-tracker-covers-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/styles/base.css',
    '/styles/components.css',
    '/src/app.js',
    '/src/core/base-component.js',
    '/src/core/store.js',
    '/src/core/router.js',
    '/src/core/events.js',
    '/src/services/api-client.js',
    '/src/services/cache-manager.js',
    '/src/services/offline-queue.js',
    '/src/components/shared/bt-loading.js',
    '/src/components/shared/bt-book-card.js',
    '/src/components/shared/bt-book-cover.js',
    '/src/components/shared/bt-progress-bar.js',
    '/src/components/shared/bt-status-badge.js',
    '/src/components/shared/bt-modal.js',
    '/src/components/shared/bt-empty-state.js',
    '/src/components/shared/bt-toast.js',
    '/src/components/layout/bt-app-shell.js',
    '/src/components/layout/bt-nav.js',
    '/src/components/layout/bt-fab.js',
    '/src/components/books/bt-book-detail.js',
    '/src/components/books/bt-book-form.js',
    '/src/components/books/bt-reading-card.js',
    '/src/views/bt-login-view.js',
    '/src/views/bt-dashboard-view.js',
    '/src/views/bt-library-view.js',
    '/src/views/bt-pipeline-view.js',
    '/src/views/bt-paths-view.js'
];

// API endpoints that should use network-first strategy
const API_ENDPOINTS = ['/api/'];

// Cover image URLs (Open Library, etc.)
const COVER_DOMAINS = [
    'covers.openlibrary.org',
    'books.google.com'
];

/**
 * Install event - Cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('book-tracker-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE &&
                                   name !== COVER_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - Handle requests with appropriate strategies
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // API requests - Network first with cache fallback
    if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
        return;
    }

    // Cover images - Stale while revalidate
    if (COVER_DOMAINS.some(domain => url.hostname.includes(domain))) {
        event.respondWith(staleWhileRevalidateStrategy(request, COVER_CACHE));
        return;
    }

    // Static assets - Cache first
    if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
        return;
    }

    // Default - Network first
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

/**
 * Cache First Strategy
 * Best for: Static assets that don't change often
 */
async function cacheFirstStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache first fetch failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network First Strategy
 * Best for: API calls and dynamic content
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);

        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return a JSON error for API requests
        if (request.url.includes('/api/')) {
            return new Response(
                JSON.stringify({ error: 'Offline', offline: true }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        return new Response('Offline', { status: 503 });
    }
}

/**
 * Stale While Revalidate Strategy
 * Best for: Content that updates occasionally (covers, etc.)
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
    const cachedResponse = await caches.match(request);

    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                const cache = caches.open(cacheName);
                cache.then(c => c.put(request, networkResponse.clone()));
            }
            return networkResponse;
        })
        .catch(() => null);

    // Return cached response immediately if available
    // Network response will update cache in background
    return cachedResponse || fetchPromise;
}

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHES':
            clearAllCaches().then(() => {
                event.ports[0]?.postMessage({ success: true });
            });
            break;

        case 'CACHE_URLS':
            cacheUrls(payload.urls).then(() => {
                event.ports[0]?.postMessage({ success: true });
            });
            break;
    }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(
        cacheNames
            .filter(name => name.startsWith('book-tracker-'))
            .map(name => caches.delete(name))
    );
    console.log('[SW] All caches cleared');
}

/**
 * Cache specific URLs
 */
async function cacheUrls(urls) {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('[SW] URLs cached:', urls);
}

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'sync-mutations') {
        event.waitUntil(syncMutations());
    }
});

/**
 * Background sync
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-mutations') {
        event.waitUntil(syncMutations());
    }
});

/**
 * Sync pending mutations
 */
async function syncMutations() {
    // Notify all clients to sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_MUTATIONS' });
    });
}

console.log('[SW] Service worker loaded');
