/* Buchee Social: push notifications and reliable, privacy-conscious PWA updates. */
const BUCHEE_STATIC_CACHE = 'buchee-static-v20261103-mobile-video-1';
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
    icon: './buchee-social-app-icon.svg?v=20261102-buchee-logo-2',
    badge: './buchee-social-app-icon.svg?v=20261024-new-p-logo-1',
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
  if (!/\.(css|js|svg|png|webp|woff2|webmanifest)$/i.test(url.pathname)) return;

  const mustRefresh = /\/(?:app\.js|buchee-pwa-auto-update-20261102\.js|buchee-centered-original-logo-20261103\.(css|js)|buchee-header-purple-wordmark\.svg|buchee-visual-consistency-20261103\.css)$/i.test(url.pathname);
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
      if (stored) return stored;
      throw error;
    }
  })());
});
