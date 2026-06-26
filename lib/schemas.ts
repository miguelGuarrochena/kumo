// Schemas Zod compartidos — extraídos de los server actions para poder testearlos
// sin levantar Supabase. Las actions importan estos schemas.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reminder
// ---------------------------------------------------------------------------

export const REMINDER_TYPES = ['medical', 'birthday', 'generic'] as const;

// Hoy en formato YYYY-MM-DD usando hora local del server. Lo recalculamos
// en cada validación (no lo memorizamos a nivel módulo) para que un proceso
// long-running siempre compare contra la fecha actual.
const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const reminderSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Título requerido').max(100),
  description: z.string().max(500).optional().nullable(),
  reminder_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    // Bloqueamos fechas pasadas: un recordatorio del pasado no tiene sentido
    // y antes confundía al user (creaba eventos que ya nunca se iban a disparar).
    .refine((d) => d >= todayKey(), 'La fecha no puede ser anterior a hoy'),
  reminder_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Hora inválida')
    .optional()
    .nullable(),
  reminder_type: z.enum(REMINDER_TYPES).default('generic'),
  is_recurring: z.coerce.boolean().default(false),
  notify_days_before: z.coerce.number().int().min(0).max(60).default(1),
  notify_contact_ids: z.array(z.string().uuid()).default([]),
});

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export const EXPENSE_CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'CLP', 'COP', 'BRL', 'GBP'] as const;
export const RECURRENCE = ['weekly', 'monthly', 'yearly'] as const;
export const EXPENSE_KIND = ['expense', 'income'] as const;

export const expenseSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  currency: z.enum(EXPENSE_CURRENCIES),
  kind: z.enum(EXPENSE_KIND).default('expense'),
  description: z.string().max(200).optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_recurring: z.coerce.boolean().default(false),
  recurrence_type: z.enum(RECURRENCE).optional().nullable(),
  paid: z.coerce.boolean().default(true),
  notify_contact_ids: z.array(z.string().uuid()).default([]),
});

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

export const shoppingItemSchema = z.object({
  list_name: z.string().min(1).max(40),
  name: z.string().min(1, 'Nombre requerido').max(100),
  quantity: z.string().max(40).nullable().optional(),
  unit: z.string().max(20).nullable().optional(),
});
