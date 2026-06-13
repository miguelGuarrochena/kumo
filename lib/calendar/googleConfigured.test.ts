import { describe, expect, it, afterEach, vi } from 'vitest';
import {
  isGoogleCalendarOAuthConfigured,
  googleCalendarRedirectUri,
} from './googleConfigured';

describe('isGoogleCalendarOAuthConfigured', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('true cuando hay client id y secret', () => {
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', 'id');
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', 'secret');
    expect(isGoogleCalendarOAuthConfigured()).toBe(true);
  });

  it('false si falta el secret', () => {
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', 'id');
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', '');
    expect(isGoogleCalendarOAuthConfigured()).toBe(false);
  });

  it('false si los valores son solo espacios', () => {
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', '   ');
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', '   ');
    expect(isGoogleCalendarOAuthConfigured()).toBe(false);
  });
});

describe('googleCalendarRedirectUri', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('deriva del origin cuando no hay override', () => {
    vi.stubEnv('GOOGLE_CALENDAR_REDIRECT_URI', undefined);
    expect(googleCalendarRedirectUri('https://kumo-app.com')).toBe(
      'https://kumo-app.com/api/auth/google-calendar/callback',
    );
  });

  it('normaliza barra final del origin', () => {
    vi.stubEnv('GOOGLE_CALENDAR_REDIRECT_URI', undefined);
    expect(googleCalendarRedirectUri('https://kumo-app.com/')).toBe(
      'https://kumo-app.com/api/auth/google-calendar/callback',
    );
  });

  it('respeta el override explícito', () => {
    vi.stubEnv('GOOGLE_CALENDAR_REDIRECT_URI', 'https://custom.dev/cb');
    expect(googleCalendarRedirectUri('https://kumo-app.com')).toBe('https://custom.dev/cb');
  });
});
