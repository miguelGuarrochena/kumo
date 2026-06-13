import { describe, expect, it } from 'vitest';
import { monthProgress, projectMonthSpend, shouldShowForecast } from './forecast';

describe('projectMonthSpend', () => {
  it('extrapola linealmente al cierre del mes', () => {
    const progress = { dayOfMonth: 10, daysInMonth: 30 };
    expect(projectMonthSpend(100, progress)).toBeCloseTo(300);
  });

  it('devuelve null sin gastos', () => {
    expect(projectMonthSpend(0, { dayOfMonth: 5, daysInMonth: 30 })).toBeNull();
  });
});

describe('shouldShowForecast', () => {
  it('oculta sin gastos del mes', () => {
    expect(shouldShowForecast(0, { dayOfMonth: 5, daysInMonth: 30 })).toBe(false);
  });

  it('oculta el último día del mes', () => {
    expect(shouldShowForecast(5, { dayOfMonth: 30, daysInMonth: 30 })).toBe(false);
  });

  it('muestra con gastos y días restantes', () => {
    expect(shouldShowForecast(3, { dayOfMonth: 10, daysInMonth: 30 })).toBe(true);
  });
});

describe('monthProgress', () => {
  it('calcula día y total del mes', () => {
    const p = monthProgress(new Date(2026, 5, 13)); // 13 jun 2026
    expect(p.dayOfMonth).toBe(13);
    expect(p.daysInMonth).toBe(30);
  });
});
