import { createHmac, timingSafeEqual } from 'crypto';

const feedSecret = () =>
  process.env.CALENDAR_FEED_SECRET
  ?? process.env.CRON_SECRET
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? '';

const signPayload = (userId: string, version: number): string =>
  createHmac('sha256', feedSecret()).update(`${userId}:${version}`).digest('base64url');

export type ParsedFeedToken = {
  userId: string;
  version: number;
};

export const signCalendarFeedToken = (userId: string, version = 0): string => {
  const sig = signPayload(userId, version);
  if (version === 0) {
    // Formato legacy (compat): userId.sig
    return `${userId}.${sig}`;
  }
  return `${userId}.${version}.${sig}`;
};

export const parseCalendarFeedToken = (token: string): ParsedFeedToken | null => {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  const userId = parts[0];
  if (!userId) return null;

  if (parts.length === 2) {
    return { userId, version: 0 };
  }

  const version = Number(parts[1]);
  if (!Number.isInteger(version) || version < 0) return null;
  return { userId, version };
};

export const verifyCalendarFeedToken = (token: string): ParsedFeedToken | null => {
  const parsed = parseCalendarFeedToken(token);
  if (!parsed) return null;

  const parts = token.split('.');
  const sig = parts.length === 2 ? parts[1] : parts[2];
  if (!sig) return null;
  const expected = signPayload(parsed.userId, parsed.version);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return parsed;
};

export const buildCalendarFeedUrl = (
  userId: string,
  origin: string,
  version = 0,
): string => {
  const token = signCalendarFeedToken(userId, version);
  return `${origin}/api/calendar/feed?token=${encodeURIComponent(token)}`;
};
