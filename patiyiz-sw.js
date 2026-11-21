/* Buchee Social: push notifications and reliable, privacy-conscious PWA updates. */
const BUCHEE_STATIC_CACHE = 'buchee-static-v20261104-concept4-1';
const BUCHEE_CACHE_PREFIXES = ['buchee-static-v', 'patiyiz-static-v'];

self.addEventListener('push', event => {
  let payload = {title: 'BucheeSocial', body: 'Yeni bir bildirimin var.', url: './'};
  try {
    const incoming = event.data && event.data.json();
    if (incoming && typeof incoming === 'object') payload = {...payload, ...incoming};
  } catch (_) {}
  const title = String(payload.title || 'BucheeSocial').slice(0, 120);
  const body = String(payload.body || 'Yeni bir bildirimin var.').slice(0, 220);
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './buchee-app-icon-192.png?v=20261104-concept4',
    badge: './buchee-app-icon-48.png?v=20261104-concept4',
    tag: 'buchee-' + String(payload.id || 'notice'),
    data: {url: payload.id ? './?notification=' + encodeURIComponent(String(payload.id)) : './'},
    renotify: false
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const url = new URL(event.notification.data && event.notification.data.url || './', self.registration.scope).href;
    for (const win of windows) {
      if (new URL(win.url).origin === self.location.origin) {
        if (typeof win.navigate === 'function') await win.navigate(url);
        await win.focus();
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(BUCHEE_STATIC_CACHE);
    try { await cache.add('./offline.html'); } catch (_) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k =>
      BUCHEE_CACHE_PREFIXES.some(prefix => k.startsWith(prefix)) && k !== BUCHEE_STATIC_CACHE
    ).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'BUCHEE_SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    // Always revalidate the application HTML; never cache signed-in documents.
    event.respondWith(fetch(request, {cache: 'no-cache'}).catch(async () => {
      const cache = await caches.open(BUCHEE_STATIC_CACHE);
      return await cache.match('./offline.html') || Response.error();
    }));
    return;
  }
  // Cache application-owned root assets only. Never cache uploaded/private files,
  // signed URLs or arbitrary nested paths that may happen to end in .png/.webp.
  const scopePath = new URL(self.registration.scope).pathname;
  if (!url.pathname.startsWith(scopePath)) return;
  const asset = url.pathname.slice(scopePath.length);
  if (!/^[a-zA-Z0-9._-]+\.(?:css|js|svg|png|webp|woff2|webmanifest)$/i.test(asset)) return;
  if (url.searchParams.has('token') || url.searchParams.has('signature')) return;

  // Code and screen styles must be network-first. Stale-while-revalidate caused
  // installed iPhone PWAs to display a previous screen layout on first open.
  const mustRefresh = /\.(?:css|js|svg|webmanifest)$/i.test(asset);
  event.respondWith((async () => {
    const cache = await caches.open(BUCHEE_STATIC_CACHE);
    const stored = await cache.match(request);
    const fetchFresh = async () => {
      const response = await fetch(request, {cache: mustRefresh ? 'no-cache' : 'default'});
      if (response.ok && response.type === 'basic') {
        try { await cache.put(request, response.clone()); } catch (_) {}
      }
      return response;
    };

    if (!mustRefresh && stored) {
      event.waitUntil(fetchFresh().catch(() => {}));
      return stored;
    }
    try {
      return await fetchFresh();
    } catch (error) {
      if (stored) return stored; // Offline fallback only for previously loaded static assets.
      throw error;
    }
  })());
});
