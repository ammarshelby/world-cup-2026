/* =====================================================================
   WORLD CUP 26 — Service Worker
   Runs in the background (even when the app is closed) and shows a
   notification when a goal push arrives.
   ===================================================================== */

const APP_URL = 'world-cup-2026.html';

// Activate immediately on install/update
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

/* ---- Incoming push ---- */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'World Cup 26', body: event.data ? event.data.text() : 'Match update' };
  }

  const title = data.title || '⚽ GOAL!';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: data.tag || 'wc26-goal',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || APP_URL }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ---- Tapping the notification opens the app ---- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || APP_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

/* ---- If the subscription is rotated by the browser, tell the backend ---- */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const cfg = await (await fetch('push-config.json', { cache: 'no-store' })).json();
      if (!cfg.api || !cfg.publicKey) return;
      const sub = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: cfg.publicKey
      });
      await fetch(cfg.api + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub })
      });
    } catch (err) { /* ignore */ }
  })());
});
