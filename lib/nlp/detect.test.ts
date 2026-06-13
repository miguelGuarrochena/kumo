import { describe, expect, it } from 'vitest';
import { looksExpenseIntent } from './detect';

describe('looksExpenseIntent', () => {
  it('detecta frases típicas en español', () => {
    expect(looksExpenseIntent('gasté 5000 en el super')).toBe(true);
    expect(looksExpenseIntent('pagué 12000 luz')).toBe(true);
  });

  it('detecta inglés con verbo', () => {
    expect(looksExpenseIntent('paid 50 for uber')).toBe(true);
  });

  it('rechaza búsquedas sin verbo ni contexto', () => {
    expect(looksExpenseIntent('netflix')).toBe(false);
    expect(looksExpenseIntent('ab')).toBe(false);
  });

  it('acepta monto + comercio corto sin verbo', () => {
    expect(looksExpenseIntent('5000 de supermercado')).toBe(true);
    expect(looksExpenseIntent('5000 supermercado')).toBe(true);
    expect(looksExpenseIntent('12000 luz')).toBe(true);
  });

  it('acepta frases largas con monto aunque no tengan verbo', () => {
    expect(looksExpenseIntent('5000 pesos supermercado carrefour')).toBe(true);
  });
});
