import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest';
import { currentWaMonthKey, WA_MONTHLY_CAP, WA_MAX_RECIPIENTS_PER_ALERT } from './waLimits';

describe('currentWaMonthKey', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formatea YYYY-MM en UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T23:30:00.000Z'));
    expect(currentWaMonthKey()).toBe('2026-03');
  });

  it('rellena el mes con cero a la izquierda', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    expect(currentWaMonthKey()).toBe('2026-01');
  });

  it('usa UTC y no la zona local en el borde de fin de mes', () => {
    vi.useFakeTimers();
    // 2026-04-30 23:00Z sigue siendo abril en UTC.
    vi.setSystemTime(new Date('2026-04-30T23:00:00.000Z'));
    expect(currentWaMonthKey()).toBe('2026-04');
  });
});

describe('límites por defecto', () => {
  it('cap mensual por defecto es positivo', () => {
    expect(WA_MONTHLY_CAP).toBeGreaterThan(0);
  });

  it('máximo de destinatarios por defecto es positivo', () => {
    expect(WA_MAX_RECIPIENTS_PER_ALERT).toBeGreaterThan(0);
  });
});
