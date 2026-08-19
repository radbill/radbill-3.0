/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { createHandlerBoundToURL, cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

interface PushMessagePayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
    tag?: string;
  };
  fcmOptions?: {
    link?: string;
  };
  fcm_options?: {
    link?: string;
  };
  data?: Record<string, string>;
}

const PORTAL_BASE_PATH = '/portal/';

function withPortalBase(path: string) {
  if (path === PORTAL_BASE_PATH.slice(0, -1) || path.startsWith(PORTAL_BASE_PATH)) {
    return path;
  }
  return `${PORTAL_BASE_PATH}${path.replace(/^\//, '')}`;
}

clientsClaim();
void self.skipWaiting();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
	allowlist: [/^\/portal(?:\/|$)/],
  }),
);

registerRoute(
	({ request, url }) => request.method === 'GET' && (url.pathname === '/api' || url.pathname.startsWith('/api/')),
  new NetworkOnly(),
);

function normalizeSafeRoute(route?: string) {
  const value = route?.trim() ?? '';
  if (value === '' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '';
  }
  for (const char of value) {
    if (char < ' ') {
      return '';
    }
  }
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) {
      return '';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

function normalizeSafeLink(link?: string) {
  const value = link?.trim() ?? '';
  if (value === '') {
    return '';
  }
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) {
      return '';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

function resolveNotificationLink(payload: PushMessagePayload) {
  const link = normalizeSafeLink(payload.fcmOptions?.link || payload.fcm_options?.link);
  if (link !== '') {
    return withPortalBase(link);
  }
  const route = normalizeSafeRoute(payload.data?.route);
  if (route !== '') {
    return withPortalBase(route);
  }
  return PORTAL_BASE_PATH;
}

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json() as PushMessagePayload;
    
    const title = payload.notification?.title?.trim() || 'RadBill';
    const body = payload.notification?.body?.trim() || 'Anda memiliki notifikasi baru.';
    const icon = payload.notification?.icon?.trim() || `${PORTAL_BASE_PATH}pwa-192x192.png`;
    const tag = payload.notification?.tag?.trim() || payload.data?.notification_id || payload.data?.event || 'radbill-notification';

    let linkObj = payload.fcmOptions;
    if (!linkObj && payload.fcm_options) {
      linkObj = payload.fcm_options;
    }
    
    const link = resolveNotificationLink({ ...payload, fcmOptions: linkObj });

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge: `${PORTAL_BASE_PATH}pwa-192x192.png`,
        tag,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { link },
      } as any)
    );
  } catch (error) {
    console.warn('Failed to handle background push messaging', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawLink = typeof event.notification.data?.link === 'string' ? event.notification.data.link : PORTAL_BASE_PATH;
  const link = withPortalBase(normalizeSafeRoute(rawLink) || PORTAL_BASE_PATH);

  event.waitUntil(
    (async () => {
      const targetURL = new URL(link, self.location.origin).toString();
      const matchedClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const matchedClient of matchedClients) {
        if (!('focus' in matchedClient)) {
          continue;
        }
        const currentURL = new URL(matchedClient.url);
        if (currentURL.origin !== self.location.origin) {
          continue;
        }
        await matchedClient.navigate(targetURL);
        await matchedClient.focus();
        return;
      }

      await self.clients.openWindow(targetURL);
    })(),
  );
});
