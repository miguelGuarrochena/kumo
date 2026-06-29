import { describe, expect, it } from 'vitest';
import { computeSpend, budgetStatus, pickBudgetAlertThreshold, type ExpenseLite } from './budgets';

const RATES = { USD: 1, ARS: 1000, EUR: 0.9 };

const expenses: ExpenseLite[] = [
  { amount: 100, currency: 'USD', category_id: 'food' },
  { amount: 50_000, currency: 'ARS', category_id: 'food' },
  { amount: 20, currency: 'USD', category_id: 'transport' },
  { amount: 10, currency: 'USD', category_id: null },
];

describe('computeSpend', () => {
  it('suma solo la categoría pedida convirtiendo a la moneda destino', () => {
    // food: 100 USD + 50.000 ARS (=50 USD) = 150 USD
    const r = computeSpend(expenses, 'food', 'USD', RATES);
    expect(r.spent).toBeCloseTo(150);
    expect(r.rateMissing).toBe(false);
  });

  it('con categoryId null suma todo (total del mes)', () => {
    // 100 + 50 + 20 + 10 = 180 USD
    const r = computeSpend(expenses, null, 'USD', RATES);
    expect(r.spent).toBeCloseTo(180);
  });

  it('convierte a otra moneda destino', () => {
    // transport: 20 USD -> ARS = 20.000
    const r = computeSpend(expenses, 'transport', 'ARS', RATES);
    expect(r.spent).toBeCloseTo(20_000);
  });

  it('marca rateMissing cuando falta una cotización y no suma ese monto', () => {
    const r = computeSpend(
      [{ amount: 100, currency: 'BRL', category_id: 'food' }],
      'food',
      'USD',
      RATES,
    );
    expect(r.rateMissing).toBe(true);
    expect(r.spent).toBe(0);
  });
});

describe('budgetStatus', () => {
  it('ok por debajo del 80%', () => {
    expect(budgetStatus(0)).toBe('ok');
    expect(budgetStatus(0.79)).toBe('ok');
  });

  it('warn entre 80% y 100%', () => {
    expect(budgetStatus(0.8)).toBe('warn');
    expect(budgetStatus(0.99)).toBe('warn');
  });

  it('met al 100% exacto (objetivo cumplido, no se pasó)', () => {
    expect(budgetStatus(1)).toBe('met');
  });

  it('over al pasarse del 100%', () => {
    expect(budgetStatus(1.01)).toBe('over');
    expect(budgetStatus(1.5)).toBe('over');
  });
});

describe('pickBudgetAlertThreshold', () => {
  it('sugiere 80% si aún no se envió', () => {
    expect(pickBudgetAlertThreshold(0.85, new Set())).toBe('80');
  });

  it('sugiere 100% si se pasó del tope', () => {
    expect(pickBudgetAlertThreshold(1.1, new Set())).toBe('100');
  });

  it('no repite alertas ya enviadas', () => {
    expect(pickBudgetAlertThreshold(0.9, new Set(['80']))).toBeNull();
    expect(pickBudgetAlertThreshold(1.2, new Set(['80', '100']))).toBeNull();
  });

  it('salto directo a 100% no manda 80', () => {
    expect(pickBudgetAlertThreshold(1.05, new Set())).toBe('100');
  });
});
