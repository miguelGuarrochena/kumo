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

create policy "budget_alerts_sent_member_read" on public.budget_alerts_sent
  for select using (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_alerts_sent.budget_id
        and public.is_workspace_member(b.workspace_id)
    )
  );

create policy "budget_alerts_sent_admin_insert" on public.budget_alerts_sent
  for insert with check (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_alerts_sent.budget_id
        and public.is_workspace_admin(b.workspace_id)
    )
  );

create policy "budget_alerts_sent_admin_delete" on public.budget_alerts_sent
  for delete using (
    exists (
      select 1
      from public.budgets b
      where b.id = budget_alerts_sent.budget_id
        and public.is_workspace_admin(b.workspace_id)
    )
  );
