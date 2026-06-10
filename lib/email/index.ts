import { Resend } from 'resend';

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export type Email = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

const FROM_DEFAULT = 'Kumo <info@kumo-app.com>';

let cachedClient: Resend | null = null;
const getClient = (): Resend | null => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!cachedClient) cachedClient = new Resend(key);
  return cachedClient;
};

/**
 * Manda un email. Devuelve { ok: false } si no está configurado o si
 * el provider falla; nunca tira para no romper flows críticos.
 */
export const sendEmail = async (email: Email): Promise<SendResult> => {
  const client = getClient();
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY no configurada' };
  }

  try {
    const result = await client.emails.send({
      from: process.env.EMAIL_FROM ?? FROM_DEFAULT,
      to: email.to,
      subject: email.subject,
      html: email.html,
      replyTo: email.replyTo,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? '' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};
