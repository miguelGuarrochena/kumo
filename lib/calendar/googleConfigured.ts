export const isGoogleCalendarOAuthConfigured = (): boolean =>
  !!(
    process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim()
    && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
  );

// La feature está "públicamente disponible" solo cuando Google aprobó la
// verificación. Mientras tanto, el código sigue funcional pero la UI muestra
// "Coming soon" a usuarios nuevos. Los usuarios ya conectados pueden ver
// su estado y desconectar; solo se oculta el botón Connect.
export const isGoogleCalendarFeaturePublic = (): boolean =>
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_PUBLIC === 'true';

export const googleCalendarRedirectUri = (origin: string): string =>
  process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim()
  ?? `${origin.replace(/\/$/, '')}/api/auth/google-calendar/callback`;
