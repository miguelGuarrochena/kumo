-- Repara esquemas donde faltan migraciones 0021, 0025 o 0026 (idempotente).

alter table public.notification_contacts
  add column if not exists is_split_only boolean not null default false;

create index if not exists notification_contacts_split_only_idx
  on public.notification_contacts(workspace_id, is_split_only);

alter table public.notification_contacts
  add column if not exists mp_alias text,
  add column if not exists mp_payment_link text;

alter table public.expense_splits
  add column if not exists paid boolean not null default false;
