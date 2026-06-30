import { precacheAndRoute, cleanupOutdatedCaches, PrecacheEntry } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

// vite-plugin-pwa's workbox-build looks for the literal `self.__WB_MANIFEST`
// in the compiled output to inject the precache list. Augment the type so
// TypeScript accepts the property access; the runtime value is replaced at build.
declare global {
  interface ServiceWorkerGlobalScope {
    __WB_MANIFEST: Array<PrecacheEntry | string>;
  }
}

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST ?? []);
cleanupOutdatedCaches();


interface PushPayload {
  title: string;
  body: string;
  meal: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json() as PushPayload;

  // TypeScript 6 removed `actions` from NotificationOptions even though the
  // browser API accepts it at runtime - cast is required.
  const options = {
    body: data.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    actions: [
      { action: 'log-food', title: 'Log Food' },
      { action: 'log-water', title: 'Log Water' },
    ],
    data: { meal: data.meal },
  } as unknown as NotificationOptions;

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const actionUrls: Record<string, string> = {
    'log-food': '/log-food',
    'log-water': '/',
  };
  const url = actionUrls[event.action] ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0] as WindowClient;
        client.postMessage({ type: 'navigate', url });
        return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
