-- Alias / link de Mercado Pago opcionales en contactos (sin OAuth).
alter table public.notification_contacts
  add column if not exists mp_alias text,
  add column if not exists mp_payment_link text;
