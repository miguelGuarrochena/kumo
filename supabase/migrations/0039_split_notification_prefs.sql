-- Kumo · Preferencias de notificación más granulares
-- Antes había 2 toggles:
--   notify_expenses  → vencimientos de gastos + alertas de presupuesto
--   notify_reminders → recordatorios + cumpleaños
-- Ahora los desdoblamos en 4. Para no cambiar el comportamiento de nadie,
-- reinterpretamos las columnas existentes y agregamos dos nuevas:
--   notify_expenses  → SOLO vencimientos de gastos
--   notify_budgets   → SOLO alertas de presupuesto        (NUEVA)
--   notify_reminders → SOLO recordatorios
--   notify_birthdays → SOLO cumpleaños                    (NUEVA)
-- Default true en las nuevas: quien ya recibía estos avisos los sigue
-- recibiendo hasta que decida apagarlos.

alter table public.user_settings
  add column if not exists notify_budgets boolean not null default true;

alter table public.user_settings
  add column if not exists notify_birthdays boolean not null default true;
