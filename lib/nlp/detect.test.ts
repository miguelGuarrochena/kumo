import { describe, expect, it } from 'vitest';
import { looksLikeExpenseIntent } from './detect';

describe('looksLikeExpenseIntent', () => {
  it('detecta frases típicas en español', () => {
    expect(looksLikeExpenseIntent('gasté 5000 en el super')).toBe(true);
    expect(looksLikeExpenseIntent('pagué 12000 luz')).toBe(true);
  });

  it('detecta inglés con verbo', () => {
    expect(looksLikeExpenseIntent('paid 50 for uber')).toBe(true);
  });

  it('rechaza búsquedas sin verbo ni contexto', () => {
    expect(looksLikeExpenseIntent('netflix')).toBe(false);
    expect(looksLikeExpenseIntent('ab')).toBe(false);
  });

  it('acepta frases largas con monto aunque no tengan verbo', () => {
    expect(looksLikeExpenseIntent('5000 pesos supermercado carrefour')).toBe(true);
  });
});
