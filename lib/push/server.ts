import webpush from 'web-push';

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:info@kumo-app.com';

let configured = false;
const configure = () => {
  if (configured) return;
  if (!PUBLIC || !PRIVATE) return;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
};

export const isPushConfigured = () => Boolean(PUBLIC && PRIVATE);

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export const sendPush = async (
  sub: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> => {
  configure();
  if (!configured) return { ok: false, gone: false, error: 'VAPID no configurado' };

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (e) {
    const err = e as { statusCode?: number; message?: string };
    const gone = err.statusCode === 404 || err.statusCode === 410;
    return { ok: false, gone, error: err.message ?? 'Push error' };
  }
};
