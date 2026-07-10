import { describe, it, expect } from 'vitest';
import { buildRecurringPushBody, type GeneratedRecurring } from './recurringDigest';

const exp = (over: Partial<GeneratedRecurring> = {}): GeneratedRecurring => ({
  description: 'Alquiler',
  amount: 1000,
  currency: 'ARS',
  kind: 'expense',
  ...over,
});

describe('buildRecurringPushBody', () => {
  it('detalla un único gasto recurrente', () => {
    expect(buildRecurringPushBody([exp()])).toBe(
      'Se registró tu gasto recurrente: Alquiler · 1000 ARS',
    );
  });

  it('detalla un único ingreso recurrente con la etiqueta correcta', () => {
    expect(
      buildRecurringPushBody([exp({ kind: 'income', description: 'Sueldo', amount: 500000 })]),
    ).toBe('Se registró tu ingreso recurrente: Sueldo · 500000 ARS');
  });

  it('usa un fallback cuando la descripción es null', () => {
    expect(buildRecurringPushBody([exp({ description: null })])).toBe(
      'Se registró tu gasto recurrente: Gasto · 1000 ARS',
    );
    expect(buildRecurringPushBody([exp({ description: null, kind: 'income' })])).toBe(
      'Se registró tu ingreso recurrente: Ingreso · 1000 ARS',
    );
  });

  it('resume varios gastos como "gastos"', () => {
    expect(buildRecurringPushBody([exp(), exp({ description: 'Netflix' })])).toBe(
      'Se registraron 2 gastos recurrentes de este período',
    );
  });

  it('resume varios ingresos como "ingresos"', () => {
    expect(
      buildRecurringPushBody([exp({ kind: 'income' }), exp({ kind: 'income' })]),
    ).toBe('Se registraron 2 ingresos recurrentes de este período');
  });

  it('usa "movimientos" cuando hay mezcla de gastos e ingresos', () => {
    expect(buildRecurringPushBody([exp(), exp({ kind: 'income' })])).toBe(
      'Se registraron 2 movimientos recurrentes de este período',
    );
  });
});
