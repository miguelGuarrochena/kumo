import { createHmac, timingSafeEqual } from 'crypto';

const feedSecret = () =>
  process.env.CALENDAR_FEED_SECRET
  ?? process.env.CRON_SECRET
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? '';

export const signCalendarFeedToken = (userId: string): string => {
  const sig = createHmac('sha256', feedSecret()).update(userId).digest('base64url');
  return `${userId}.${sig}`;
};

export const verifyCalendarFeedToken = (token: string): string | null => {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = signCalendarFeedToken(userId).slice(dot + 1);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return userId;
};

export const buildCalendarFeedUrl = (userId: string, origin: string): string => {
  const token = signCalendarFeedToken(userId);
  return `${origin}/api/calendar/feed?token=${encodeURIComponent(token)}`;
};
