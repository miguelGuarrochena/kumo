-- Registro de alertas de presupuesto enviadas (evita repetir push 80%/100% en el mismo mes).
create table if not exists public.budget_alerts_sent (
  id         uuid primary key default gen_random_uuid(),
  budget_id  uuid not null references public.budgets(id) on delete cascade,
  month      text not null,
  threshold  text not null check (threshold in ('80', '100')),
  sent_at    timestamptz not null default now(),
  unique (budget_id, month, threshold)
);

create index if not exists budget_alerts_sent_month_idx
  on public.budget_alerts_sent(month);

alter table public.budget_alerts_sent enable row level security;
