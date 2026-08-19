import { deleteApp, getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import { fetchApi } from '../../shared/api';

interface PushFirebaseClientConfig {
  api_key: string;
  auth_domain: string;
  project_id: string;
  storage_bucket: string;
  messaging_sender_id: string;
  app_id: string;
  vapid_public_key: string;
}

interface PushRecipientConfigResponse {
  enabled: boolean;
  preference_enabled: boolean;
  installations: number;
  firebase: PushFirebaseClientConfig;
}

interface PushInstallationView {
  id: string;
  installation_key: string;
  active: boolean;
  permission_status: string;
}

export interface PushPermissionSnapshot {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
}

interface SyncCustomerPushInstallationOptions {
  requestPermission?: boolean;
}

const INSTALLATION_KEY_STORAGE = 'customer_push_installation_key';
const FIREBASE_APP_NAME = 'customer-web-push';
const PORTAL_BASE_URL = import.meta.env.BASE_URL;
const PLATFORM_SW_URL = `${PORTAL_BASE_URL}sw.js`;

let messagingSupportPromise: Promise<boolean> | null = null;
let foregroundListenerBound = false;

export class PushSetupError extends Error {
  code: 'unsupported' | 'disabled' | 'permission_blocked' | 'token_unavailable';

  constructor(code: PushSetupError['code'], message: string) {
    super(message);
    this.name = 'PushSetupError';
    this.code = code;
  }
}

function isStandaloneIOSApp() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && 'standalone' in navigator && navigator.standalone === true;
}

function summarizeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }
  if (typeof error === 'string') {
    return error.trim();
  }
  return '';
}

export function explainPushActivationError(error: unknown) {
  if (error instanceof PushSetupError) {
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.trim();

    if (message.includes('messaging/unsupported-browser')) {
      return 'Browser ini belum mendukung Firebase push notification.';
    }
    if (message.includes('messaging/permission-blocked')) {
      return 'Izin notifikasi diblokir oleh browser.';
    }
    if (message.includes('messaging/token-subscribe-failed')) {
      return `Browser gagal mendaftarkan token push. Detail: ${message}`;
    }
    if (message.includes('messaging/get-token')) {
      return `Firebase gagal membuat token push. Detail: ${message}`;
    }
    if (message.includes('Failed to register a ServiceWorker')) {
      return `Service worker push gagal didaftarkan. Detail: ${message}`;
    }
    if (message.includes('Subscription failed')) {
      return `Browser gagal membuat subscription push. Detail: ${message}`;
    }
  }

  if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandaloneIOSApp()) {
    return 'Di iPhone/iPad, notifikasi push hanya bisa diaktifkan jika portal dibuka dari Home Screen.';
  }

  const detail = summarizeUnknownError(error);
  if (detail) {
    return `Aktivasi notifikasi browser gagal. Detail: ${detail}`;
  }
  return 'Aktivasi notifikasi browser gagal sebelum device sempat didaftarkan ke server.';
}

function getInstallationKey() {
  const current = window.localStorage.getItem(INSTALLATION_KEY_STORAGE);
  if (current) {
    return current;
  }
  const next =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `push-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(INSTALLATION_KEY_STORAGE, next);
  return next;
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) {
    return 'android';
  }
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    return 'ios';
  }
  if (ua.includes('mac os x')) {
    return 'macos';
  }
  if (ua.includes('windows')) {
    return 'windows';
  }
  if (ua.includes('linux')) {
    return 'linux';
  }
  return 'web';
}

function detectBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) {
    return 'edge';
  }
  if (ua.includes('opr/') || ua.includes('opera')) {
    return 'opera';
  }
  if (ua.includes('firefox/')) {
    return 'firefox';
  }
  if (ua.includes('chrome/')) {
    return 'chrome';
  }
  if (ua.includes('safari/')) {
    return 'safari';
  }
  return 'unknown';
}

function detectDeviceLabel() {
  const platform = detectPlatform();
  const browser = detectBrowser();
  return `${browser} on ${platform}`;
}

async function supportsPushMessaging() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  if (!messagingSupportPromise) {
    messagingSupportPromise = isSupported().catch(() => false);
  }
  return messagingSupportPromise;
}

export async function getPushPermissionSnapshot(): Promise<PushPermissionSnapshot> {
  const supported = await supportsPushMessaging();
  if (!supported) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

function resolveFirebaseApp(config: PushFirebaseClientConfig): FirebaseApp {
  const existing = getApps().find((item) => item.name === FIREBASE_APP_NAME);
  if (existing) {
    return getApp(FIREBASE_APP_NAME);
  }
  return initializeApp(
    {
      apiKey: config.api_key,
      authDomain: config.auth_domain,
      projectId: config.project_id,
      storageBucket: config.storage_bucket,
      messagingSenderId: config.messaging_sender_id,
      appId: config.app_id,
    },
    FIREBASE_APP_NAME,
  );
}

async function resolveMessaging(config: PushFirebaseClientConfig): Promise<Messaging> {
  const app = resolveFirebaseApp(config);
  return getMessaging(app);
}

async function resolveMessagingServiceWorker() {
  const existing = await navigator.serviceWorker.getRegistration(PORTAL_BASE_URL);
  if (existing) {
    return existing;
  }
  return navigator.serviceWorker.register(PLATFORM_SW_URL, { scope: PORTAL_BASE_URL });
}

function resolveForegroundLink(payload: { fcmOptions?: { link?: string }; data?: Record<string, string> }) {
  const link = normalizeSafePushLink(payload.fcmOptions?.link);
  if (link !== '') {
    return link;
  }
  const route = normalizeSafePushRoute(payload.data?.route);
  if (route) {
    return route;
  }
  return '';
}

function showForegroundNotification(payload: {
  notification?: { title?: string; body?: string };
  fcmOptions?: { link?: string };
  data?: Record<string, string>;
}) {
  if (Notification.permission !== 'granted') {
    return;
  }
  const title = payload.notification?.title?.trim() || 'RadBill';
  const body = payload.notification?.body?.trim() || 'Anda memiliki notifikasi baru.';
  const link = resolveForegroundLink(payload);
  const notification = new Notification(title, {
    body,
    icon: `${PORTAL_BASE_URL}pwa-192x192.png`,
    badge: `${PORTAL_BASE_URL}pwa-192x192.png`,
    tag: payload.data?.notification_id || payload.data?.event || 'radbill-notification',
    vibrate: [200, 100, 200],
    requireInteraction: true,
  } as any);
  if (link) {
    notification.onclick = () => {
      window.focus();
      window.location.assign(link);
      notification.close();
    };
  }
}

async function ensureForegroundListener(config: PushFirebaseClientConfig) {
  if (foregroundListenerBound) {
    return;
  }
  const messaging = await resolveMessaging(config);
  onMessage(messaging, (payload) => {
    showForegroundNotification(payload);
  });
  foregroundListenerBound = true;
}

function normalizeSafePushRoute(route?: string) {
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
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

function normalizeSafePushLink(link?: string) {
  const value = link?.trim() ?? '';
  if (value === '') {
    return '';
  }
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

export async function syncCustomerPushInstallation(options: SyncCustomerPushInstallationOptions = {}) {
  try {
    const supported = await supportsPushMessaging();
    if (!supported) {
      if (options.requestPermission) {
        throw new PushSetupError('unsupported', 'Browser ini belum mendukung push notification.');
      }
      return null;
    }

    const configResponse = await fetchApi<PushRecipientConfigResponse>('/customer/push/config');
    if (!configResponse.data.enabled) {
      if (options.requestPermission) {
        throw new PushSetupError('disabled', 'Push browser belum aktif di server.');
      }
      return null;
    }
    if (!configResponse.data.preference_enabled) {
      await revokeCustomerPushInstallation();
      return null;
    }

    let permission = Notification.permission;
    if (permission === 'default' && options.requestPermission) {
      permission = await Notification.requestPermission();
    }
    if (permission === 'default') {
      return null;
    }

    const installationKey = getInstallationKey();
    if (permission !== 'granted') {
      if (permission === 'denied') {
        await revokeCustomerPushInstallation();
      }
      if (options.requestPermission) {
        throw new PushSetupError('permission_blocked', 'Izin notifikasi belum diberikan di browser ini.');
      }
      return null;
    }

    const registration = await resolveMessagingServiceWorker();
    const messaging = await resolveMessaging(configResponse.data.firebase);
    const token = await getToken(messaging, {
      vapidKey: configResponse.data.firebase.vapid_public_key,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      if (options.requestPermission) {
        throw new PushSetupError('token_unavailable', 'Token push browser belum berhasil dibuat.');
      }
      return null;
    }

    const response = await fetchApi<PushInstallationView>(
      `/customer/push/installations/${encodeURIComponent(installationKey)}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          registration_kind: 'fcm_token',
          registration_id: token,
          platform: detectPlatform(),
          browser: detectBrowser(),
          device_label: detectDeviceLabel(),
        }),
      },
    );

    await ensureForegroundListener(configResponse.data.firebase);
    return response.data;
  } catch (error) {
    if (options.requestPermission) {
      console.error('Customer push activation failed', error);
      throw error instanceof PushSetupError ? error : new Error(explainPushActivationError(error));
    }
    console.warn('Background customer push sync failed', error);
    return null;
  }
}

export async function revokeCustomerPushInstallation() {
  const installationKey = window.localStorage.getItem(INSTALLATION_KEY_STORAGE);

  if (installationKey) {
    try {
      await fetchApi<{ revoked: boolean }>(`/customer/push/installations/${encodeURIComponent(installationKey)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to revoke customer push installation', error);
    }
  }

  const firebaseApp = getApps().find((item) => item.name === FIREBASE_APP_NAME);
  if (firebaseApp) {
    await deleteApp(firebaseApp).catch(() => undefined);
  }
  foregroundListenerBound = false;
}
