-- Recordatorio por email antes de que termine el período (30 y 7 días).

alter table public.subscriptions
  add column if not exists expiry_reminder_30d_at timestamptz,
  add column if not exists expiry_reminder_7d_at timestamptz;
