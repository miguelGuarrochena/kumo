import { describe, expect, it } from 'vitest';
import { expenseSchema, reminderSchema, shoppingItemSchema } from './schemas';

describe('reminderSchema', () => {
  // Fecha futura para que los tests no se rompan por la validación
  // "reminder_date >= today" agregada en schemas.ts.
  const futureDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const base = {
    title: 'Cumpleaños Juampi',
    reminder_date: futureDate,
    reminder_type: 'birthday',
  };

  it('rechaza fecha en el pasado', () => {
    const r = reminderSchema.safeParse({ ...base, reminder_date: '2020-01-01' });
    expect(r.success).toBe(false);
  });

  it('acepta un payload mínimo válido', () => {
    const r = reminderSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.is_recurring).toBe(false);
      expect(r.data.notify_days_before).toBe(1);
      expect(r.data.reminder_type).toBe('birthday');
    }
  });

  it('rechaza título vacío', () => {
    const r = reminderSchema.safeParse({ ...base, title: '' });
    expect(r.success).toBe(false);
  });

  it('rechaza título de más de 100 chars', () => {
    const r = reminderSchema.safeParse({ ...base, title: 'a'.repeat(101) });
    expect(r.success).toBe(false);
  });

  it('rechaza fecha con formato inválido', () => {
    const cases = ['18/05/2026', '2026-5-18', '20260518', 'foo'];
    for (const reminder_date of cases) {
      const r = reminderSchema.safeParse({ ...base, reminder_date });
      expect(r.success).toBe(false);
    }
  });

  it('acepta hora HH:MM y HH:MM:SS', () => {
    expect(reminderSchema.safeParse({ ...base, reminder_time: '09:30' }).success).toBe(true);
    expect(reminderSchema.safeParse({ ...base, reminder_time: '09:30:45' }).success).toBe(true);
  });

  it('rechaza hora inválida', () => {
    expect(reminderSchema.safeParse({ ...base, reminder_time: '9:30' }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, reminder_time: 'foo' }).success).toBe(false);
  });

  it('rechaza notify_days_before fuera de [0,60]', () => {
    expect(reminderSchema.safeParse({ ...base, notify_days_before: -1 }).success).toBe(false);
    expect(reminderSchema.safeParse({ ...base, notify_days_before: 61 }).success).toBe(false);
  });

  it('rechaza tipo no válido', () => {
    const r = reminderSchema.safeParse({ ...base, reminder_type: 'medical_emergency' });
    expect(r.success).toBe(false);
  });
});

describe('expenseSchema', () => {
  const base = {
    amount: 100,
    currency: 'ARS',
    expense_date: '2026-05-18',
  };

  it('acepta payload mínimo', () => {
    const r = expenseSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.paid).toBe(true);
      expect(r.data.is_recurring).toBe(false);
    }
  });

  it('rechaza monto negativo o cero', () => {
    expect(expenseSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it('coerce monto string a número', () => {
    const r = expenseSchema.safeParse({ ...base, amount: '99.5' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.amount).toBe(99.5);
  });

  it('rechaza moneda no soportada', () => {
    const r = expenseSchema.safeParse({ ...base, currency: 'XYZ' });
    expect(r.success).toBe(false);
  });

  it('rechaza descripción > 200 chars', () => {
    const r = expenseSchema.safeParse({ ...base, description: 'a'.repeat(201) });
    expect(r.success).toBe(false);
  });

  it('valida recurrence_type cuando se provee', () => {
    expect(expenseSchema.safeParse({ ...base, recurrence_type: 'monthly' }).success).toBe(true);
    expect(expenseSchema.safeParse({ ...base, recurrence_type: 'daily' }).success).toBe(false);
  });

  it('valida due_date formato', () => {
    expect(expenseSchema.safeParse({ ...base, due_date: '2026-12-01' }).success).toBe(true);
    expect(expenseSchema.safeParse({ ...base, due_date: '12/01/2026' }).success).toBe(false);
  });
});

describe('shoppingItemSchema', () => {
  const base = { list_name: 'Supermercado', name: 'Pan' };

  it('acepta payload mínimo', () => {
    expect(shoppingItemSchema.safeParse(base).success).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    expect(shoppingItemSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('rechaza list_name vacío', () => {
    expect(shoppingItemSchema.safeParse({ ...base, list_name: '' }).success).toBe(false);
  });

  it('acepta quantity y unit como strings', () => {
    const r = shoppingItemSchema.safeParse({ ...base, quantity: '2', unit: 'kg' });
    expect(r.success).toBe(true);
  });

  it('acepta quantity null o ausente', () => {
    expect(shoppingItemSchema.safeParse({ ...base, quantity: null }).success).toBe(true);
    expect(shoppingItemSchema.safeParse(base).success).toBe(true);
  });

  it('limita quantity a 40 chars', () => {
    expect(
      shoppingItemSchema.safeParse({ ...base, quantity: 'a'.repeat(41) }).success,
    ).toBe(false);
  });
});
