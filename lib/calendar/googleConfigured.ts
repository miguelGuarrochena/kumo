export const isGoogleCalendarOAuthConfigured = (): boolean =>
  !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
    && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  );

export const googleCalendarRedirectUri = (origin: string): string =>
  process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
  ?? `${origin.replace(/\/$/, '')}/api/auth/google-calendar/callback`;
