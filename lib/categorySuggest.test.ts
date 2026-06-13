import { describe, expect, it } from 'vitest';
import {
  descriptionsMatch,
  normalizeExpenseDescription,
  pickCategoryFromHistory,
} from './categorySuggest';

describe('normalizeExpenseDescription', () => {
  it('trim and lowercase', () => {
    expect(normalizeExpenseDescription('  Carrefour  ')).toBe('carrefour');
  });
});

describe('descriptionsMatch', () => {
  it('matches exact normalized', () => {
    expect(descriptionsMatch('Uber', 'uber')).toBe(true);
  });

  it('matches containment for longer strings', () => {
    expect(descriptionsMatch('Uber Eats', 'Uber')).toBe(true);
    expect(descriptionsMatch('Spotify', 'Spotify Premium')).toBe(true);
  });

  it('rejects unrelated short strings', () => {
    expect(descriptionsMatch('ab', 'cd')).toBe(false);
  });
});

describe('pickCategoryFromHistory', () => {
  const catA = '11111111-1111-1111-1111-111111111111';
  const catB = '22222222-2222-2222-2222-222222222222';

  it('returns null for short description', () => {
    expect(pickCategoryFromHistory('a', [])).toBeNull();
  });

  it('picks most frequent category', () => {
    const id = pickCategoryFromHistory('Carrefour', [
      { description: 'Carrefour', category_id: catA },
      { description: 'carrefour centro', category_id: catA },
      { description: 'Carrefour', category_id: catB },
    ]);
    expect(id).toBe(catA);
  });

  it('ignores rows without category', () => {
    expect(
      pickCategoryFromHistory('Netflix', [
        { description: 'Netflix', category_id: null },
      ]),
    ).toBeNull();
  });
});
