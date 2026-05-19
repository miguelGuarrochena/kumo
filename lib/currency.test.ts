import { describe, expect, it } from 'vitest';
import { CURRENCIES, formatMoney } from './currency';

describe('formatMoney', () => {
  it('agrega el símbolo correspondiente', () => {
    expect(formatMoney(1234.5, 'ARS')).toContain('$');
    expect(formatMoney(1234.5, 'USD')).toContain('US$');
    expect(formatMoney(1234.5, 'EUR')).toContain('€');
    expect(formatMoney(1234.5, 'GBP')).toContain('£');
  });

  it('formatea con 2 decimales y separador AR de miles', () => {
    const out = formatMoney(1234567.89, 'USD');
    // El locale es-AR usa punto para miles y coma para decimales
    expect(out).toMatch(/1\.234\.567,89/);
  });

  it('formatea cero', () => {
    expect(formatMoney(0, 'ARS')).toContain('0,00');
  });

  it('maneja números muy pequeños', () => {
    const out = formatMoney(0.5, 'USD');
    expect(out).toContain('0,50');
  });
});

describe('CURRENCIES', () => {
  it('expone las 8 monedas soportadas', () => {
    expect(CURRENCIES).toHaveLength(8);
  });

  it('cada moneda tiene code, label y symbol', () => {
    for (const c of CURRENCIES) {
      expect(c.code).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.symbol).toBeTruthy();
    }
  });

  it('incluye ARS, USD y EUR', () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(codes).toContain('ARS');
    expect(codes).toContain('USD');
    expect(codes).toContain('EUR');
  });
});
