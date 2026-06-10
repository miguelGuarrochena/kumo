import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  buildCalendarFeedUrl,
  parseCalendarFeedToken,
  signCalendarFeedToken,
  verifyCalendarFeedToken,
} from './feedToken';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('signCalendarFeedToken', () => {
  beforeEach(() => {
    process.env.CALENDAR_FEED_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CALENDAR_FEED_SECRET;
  });

  it('genera token legacy (v0) con un solo punto después del uuid', () => {
    const token = signCalendarFeedToken(USER_ID, 0);
    expect(token.startsWith(`${USER_ID}.`)).toBe(true);
    expect(token.split('.').length).toBe(2);
  });

  it('genera token versionado (v1+) con uuid.version.sig', () => {
    const token = signCalendarFeedToken(USER_ID, 2);
    const parts = token.split('.');
    expect(parts[0]).toBe(USER_ID);
    expect(parts[1]).toBe('2');
    expect(parts[2]).toBeTruthy();
  });

  it('tokens distintos por versión', () => {
    const v0 = signCalendarFeedToken(USER_ID, 0);
    const v1 = signCalendarFeedToken(USER_ID, 1);
    expect(v0).not.toBe(v1);
  });
});

describe('verifyCalendarFeedToken', () => {
  beforeEach(() => {
    process.env.CALENDAR_FEED_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CALENDAR_FEED_SECRET;
  });

  it('verifica token v0', () => {
    const token = signCalendarFeedToken(USER_ID, 0);
    expect(verifyCalendarFeedToken(token)).toEqual({ userId: USER_ID, version: 0 });
  });

  it('verifica token v2', () => {
    const token = signCalendarFeedToken(USER_ID, 2);
    expect(verifyCalendarFeedToken(token)).toEqual({ userId: USER_ID, version: 2 });
  });

  it('rechaza firma inválida', () => {
    expect(verifyCalendarFeedToken(`${USER_ID}.bad-sig`)).toBeNull();
  });

  it('rechaza token malformado', () => {
    expect(verifyCalendarFeedToken('')).toBeNull();
    expect(verifyCalendarFeedToken('nouser')).toBeNull();
  });
});

describe('parseCalendarFeedToken', () => {
  it('parsea legacy como v0', () => {
    expect(parseCalendarFeedToken(`${USER_ID}.abc`)).toEqual({ userId: USER_ID, version: 0 });
  });

  it('parsea version explícita', () => {
    expect(parseCalendarFeedToken(`${USER_ID}.3.xyz`)).toEqual({ userId: USER_ID, version: 3 });
  });
});

describe('buildCalendarFeedUrl', () => {
  beforeEach(() => {
    process.env.CALENDAR_FEED_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.CALENDAR_FEED_SECRET;
  });

  it('arma URL con token encoded', () => {
    const url = buildCalendarFeedUrl(USER_ID, 'https://kumo-app.com', 1);
    expect(url).toMatch(/^https:\/\/kumo-app\.com\/api\/calendar\/feed\?token=/);
    const token = decodeURIComponent(new URL(url).searchParams.get('token')!);
    expect(verifyCalendarFeedToken(token)?.version).toBe(1);
  });
});
