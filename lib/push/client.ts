// Cliente: registra SW, pide permiso, suscribe al Push API y manda al server.

const SW_URL = '/sw.js';

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Std = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Std);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getPermission = (): NotificationPermission =>
  pushSupported() ? Notification.permission : 'denied';

export const registerSw = async (): Promise<ServiceWorkerRegistration> => {
  return await navigator.serviceWorker.register(SW_URL);
};

export const subscribeToPush = async (vapidPublicKey: string): Promise<{
  endpoint: string;
  keys: { p256dh: string; auth: string };
}> => {
  const reg = await registerSw();
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return serialize(existing);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permission denied');
  }

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // Cast a ArrayBuffer concreto — el browser typing exige ArrayBuffer no SharedArrayBuffer.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
  });

  return serialize(sub);
};

export const unsubscribeFromPush = async (): Promise<boolean> => {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return false;
  return await sub.unsubscribe();
};

export const isSubscribed = async (): Promise<boolean> => {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  return !!sub;
};

const serialize = (sub: PushSubscription) => {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint as string,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
  };
};
