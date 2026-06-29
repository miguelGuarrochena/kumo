// Service Worker de Kumo.
// 1) Maneja push notifications y sus clicks.
// 2) Cache mínimo de la app shell para que cargue rápido y funcione en cortes de red.
//    No cacheamos data de Supabase ni endpoints — siempre van a la red.

const CACHE = 'kumo-shell-v4';
const SHELL = ['/', '/manifest.webmanifest', '/icon.png', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // No tocamos APIs, auth ni recursos cross-origin (Supabase, MP, Resend, etc.)
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/auth/')) return;

  // Navegación: SIEMPRE a la red (con fallback al shell solo si no hay red).
  // Así, tras un deploy, nunca se sirve HTML/código viejo cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/')),
    );
    return;
  }

  // Solo cacheamos assets INMUTABLES: los chunks de Next (/_next/static, llevan
  // hash en el nombre → un deploy genera URLs nuevas, jamás se sirve código
  // viejo) y los íconos/manifest del shell. Todo lo demás (incluido JS no
  // versionado) va directo a la red.
  const isImmutable = url.pathname.startsWith('/_next/static/');
  const isShellAsset = /\.(?:png|jpg|jpeg|svg|webp|woff2?|ico|webmanifest)$/.test(url.pathname);
  if (!isImmutable && !isShellAsset) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    }),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Kumo', body: event.data.text() };
  }

  const title = payload.title || 'Kumo';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url: payload.url || '/dashboard' },
    tag: payload.tag,
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
