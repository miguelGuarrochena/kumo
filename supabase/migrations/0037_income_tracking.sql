-- Kumo · Ingresos (income)
-- Permite registrar ingresos junto a los gastos y netear (ingresos − gastos).
-- Todo lo existente queda como 'expense' por default, así nada cambia de golpe.

-- =========================================================================
-- EXPENSES: columna kind ('expense' | 'income')
-- =========================================================================
alter table public.expenses
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'income'));

-- Índice para filtrar/agregar por tipo dentro de un workspace.
create index if not exists expenses_kind_idx
  on public.expenses(workspace_id, kind, expense_date desc);

-- =========================================================================
-- CATEGORIES: columna kind ('expense' | 'income')
-- Los ingresos tienen sus propias categorías (sueldo, freelance, etc.).
-- =========================================================================
alter table public.categories
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'income'));

-- La unicidad de nombre ahora es por tipo: un "Sueldo" de ingreso no choca
-- con uno de gasto del mismo nombre.
drop index if exists public.categories_name_uniq;
create unique index if not exists categories_name_uniq
  on public.categories(workspace_id, kind, lower(trim(name)));

-- =========================================================================
-- RPC recurrentes: propagar `kind` a las ocurrencias generadas.
-- Sin esto, un ingreso recurrente (sueldo) generaría filas como gasto.
-- =========================================================================
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
        expense_date, due_date, is_recurring, recurrence_type, paid, kind,
        notify_contact_ids, parent_id, split_mode, paid_by_contact_id
      ) values (
        rec.user_id, rec.workspace_id, rec.category_id, rec.amount, rec.currency,
        rec.description, rec.next_occurrence,
        case when rec.due_date is not null then rec.next_occurrence else null end,
        false, null, false, rec.kind,
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
