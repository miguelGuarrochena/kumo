import { describe, expect, it } from 'vitest';
import {
  findRecurringCandidates,
  inferRecurrenceType,
  suggestRecurringForDescription,
  type ExpenseRecurringRow,
} from './recurringSuggest';

const row = (
  id: string,
  description: string,
  date: string,
  amount = 5000,
  is_recurring = false,
): ExpenseRecurringRow => ({
  id,
  description,
  amount,
  expense_date: date,
  is_recurring,
});

describe('inferRecurrenceType', () => {
  it('detecta patrón mensual', () => {
    expect(inferRecurrenceType(['2026-01-05', '2026-02-04', '2026-03-06'])).toBe('monthly');
  });

  it('detecta patrón semanal', () => {
    expect(inferRecurrenceType(['2026-01-01', '2026-01-08', '2026-01-15'])).toBe('weekly');
  });
});

describe('findRecurringCandidates', () => {
  it('sugiere Netflix mensual', () => {
    const history = [
      row('1', 'Netflix', '2026-01-10'),
      row('2', 'Netflix', '2026-02-10'),
      row('3', 'Netflix', '2026-03-10'),
    ];
    const candidates = findRecurringCandidates(history);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.description).toBe('Netflix');
    expect(candidates[0]?.recurrenceType).toBe('monthly');
  });

  it('ignora si ya es recurrente', () => {
    const history = [
      row('1', 'Luz', '2026-01-01', 12000, true),
      row('2', 'Luz', '2026-02-01'),
    ];
    expect(findRecurringCandidates(history)).toHaveLength(0);
  });
});

describe('suggestRecurringForDescription', () => {
  it('sugiere al tipear descripción similar', () => {
    const history = [
      row('1', 'Spotify premium', '2026-01-01'),
      row('2', 'Spotify Premium', '2026-02-01'),
    ];
    const s = suggestRecurringForDescription('spotify premium', history);
    expect(s?.recurrenceType).toBe('monthly');
    expect(s?.matchCount).toBe(2);
  });
});
