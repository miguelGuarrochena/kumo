-- Split de gastos: dividir un gasto entre varias personas (contactos del workspace).
-- 4 modos: equal (igualitario), percentage, fixed (monto fijo), items (suma de items por persona).

alter table public.expenses
  add column if not exists split_mode text default null
    check (split_mode in ('equal', 'percentage', 'fixed', 'items'));

-- Quién pagó este gasto (el adelantó la plata). Default: el creador.
alter table public.expenses
  add column if not exists paid_by_contact_id uuid
    references public.notification_contacts(id) on delete set null;

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  contact_id uuid not null references public.notification_contacts(id) on delete cascade,
  amount numeric(12, 2),       -- nullable: si modo=percentage o equal, se calcula
  percentage numeric(5, 2),    -- nullable: si modo=fixed o equal
  created_at timestamptz not null default now(),
  unique (expense_id, contact_id)
);

create index if not exists expense_splits_expense_idx on public.expense_splits(expense_id);
create index if not exists expense_splits_contact_idx on public.expense_splits(contact_id);

alter table public.expense_splits enable row level security;

drop policy if exists "expense_splits_member_read" on public.expense_splits;
create policy "expense_splits_member_read" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_workspace_member(e.workspace_id)
    )
  );

drop policy if exists "expense_splits_admin_write" on public.expense_splits;
create policy "expense_splits_admin_write" on public.expense_splits
  for all using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_workspace_admin(e.workspace_id)
    )
  ) with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_workspace_admin(e.workspace_id)
    )
  );

-- Saldos / pagos manuales: cuando alguien le paga a otro para saldar deuda.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_contact_id uuid not null references public.notification_contacts(id) on delete cascade,
  to_contact_id   uuid not null references public.notification_contacts(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'ARS',
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists payments_workspace_idx on public.payments(workspace_id);
create index if not exists payments_paid_at_idx on public.payments(paid_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_member_read" on public.payments;
create policy "payments_member_read" on public.payments
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists "payments_admin_write" on public.payments;
create policy "payments_admin_write" on public.payments
  for all using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));

-- RPC: calcula balances netos en un workspace.
-- Devuelve, por par (contact_a, contact_b), cuánto debe a quién después de
-- compensar todos los splits y payments ya registrados.
create or replace function public.workspace_balances(ws_id uuid)
returns table (
  contact_id uuid,
  contact_name text,
  net_amount numeric,
  currency text
)
language sql
stable
security definer
set search_path = public
as $$
  with raw_splits as (
    -- Cada split: el contacto "debe" la parte que le toca al payer.
    -- Si el contacto ES el payer, se cancela solo.
    select
      s.contact_id,
      e.paid_by_contact_id as payer_id,
      e.currency,
      coalesce(
        s.amount,
        case
          when e.split_mode = 'equal' then
            e.amount / nullif((select count(*) from public.expense_splits where expense_id = e.id), 0)
          when e.split_mode = 'percentage' then
            e.amount * coalesce(s.percentage, 0) / 100.0
          else 0
        end
      ) as owes
    from public.expense_splits s
    join public.expenses e on e.id = s.expense_id
    where e.workspace_id = ws_id
      and e.paid_by_contact_id is not null
  ),
  raw_payments as (
    select from_contact_id as contact_id, currency, -amount as net from public.payments where workspace_id = ws_id
    union all
    select to_contact_id   as contact_id, currency,  amount as net from public.payments where workspace_id = ws_id
  ),
  per_contact as (
    -- Total que cada contacto debe (positivo = debe; negativo = le deben).
    select contact_id, currency, sum(owes) as total
    from raw_splits
    where contact_id != coalesce(payer_id, '00000000-0000-0000-0000-000000000000'::uuid)
    group by contact_id, currency
    union all
    select payer_id, currency, -sum(owes)
    from raw_splits
    where contact_id != coalesce(payer_id, '00000000-0000-0000-0000-000000000000'::uuid)
    group by payer_id, currency
    union all
    select contact_id, currency, sum(net)
    from raw_payments
    group by contact_id, currency
  )
  select
    p.contact_id,
    c.name as contact_name,
    sum(p.total) as net_amount,
    p.currency
  from per_contact p
  join public.notification_contacts c on c.id = p.contact_id
  group by p.contact_id, c.name, p.currency
  having abs(sum(p.total)) > 0.01
  order by net_amount desc;
$$;

grant execute on function public.workspace_balances(uuid) to authenticated;

-- Update del RPC de recurring para que copie los splits al generar la nueva fila.
create or replace function public.generate_recurring_expenses()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_count int := 0;
  rec record;
  new_expense_id uuid;
  guard int := 0;
begin
  for rec in
    select * from public.expenses
    where is_recurring = true
      and next_occurrence is not null
      and next_occurrence <= current_date
      and parent_id is null
    limit 1000
  loop
    guard := 0;
    while rec.next_occurrence <= current_date and guard < 60 loop
      insert into public.expenses (
        user_id, workspace_id, category_id, amount, currency, description,
        expense_date, due_date, is_recurring, recurrence_type, paid,
        notify_contact_ids, parent_id, split_mode, paid_by_contact_id
      ) values (
        rec.user_id, rec.workspace_id, rec.category_id, rec.amount, rec.currency,
        rec.description, rec.next_occurrence,
        case when rec.due_date is not null then rec.next_occurrence else null end,
        false, null, false,
        rec.notify_contact_ids, rec.id, rec.split_mode, rec.paid_by_contact_id
      ) returning id into new_expense_id;

      -- Copia splits del original a la nueva instancia.
      insert into public.expense_splits (expense_id, contact_id, amount, percentage)
      select new_expense_id, contact_id, amount, percentage
      from public.expense_splits where expense_id = rec.id;

      rec.next_occurrence := public.compute_next_occurrence(rec.next_occurrence, rec.recurrence_type);
      generated_count := generated_count + 1;
      guard := guard + 1;
    end loop;

    update public.expenses set next_occurrence = rec.next_occurrence where id = rec.id;
  end loop;

  return generated_count;
end;
$$;
