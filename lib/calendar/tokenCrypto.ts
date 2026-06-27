import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const getKey = (): Buffer => {
  const raw =
    process.env.GOOGLE_CALENDAR_TOKEN_KEY
    ?? process.env.CRON_SECRET
    ?? process.env.SUPABASE_SECRET_KEY
    ?? 'kumo-dev-calendar-token-key';
  return createHash('sha256').update(raw).digest();
};

export const encryptToken = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${enc.toString('base64url')}.${tag.toString('base64url')}`;
};

export const decryptToken = (stored: string): string => {
  const [ivB64, encB64, tagB64] = stored.split('.');
  if (!ivB64 || !encB64 || !tagB64) throw new Error('Token cifrado inválido');
  const iv = Buffer.from(ivB64, 'base64url');
  const enc = Buffer.from(encB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};
