-- Recurring expenses: el original tiene is_recurring=true y next_occurrence
-- con la próxima fecha. Un cron diario genera las copias automáticamente y
-- avanza next_occurrence al siguiente período.

alter table public.expenses
  add column if not exists next_occurrence date,
  add column if not exists parent_id uuid references public.expenses(id) on delete set null;

create index if not exists expenses_recurring_next_idx
  on public.expenses(next_occurrence)
  where is_recurring = true;

create index if not exists expenses_parent_idx
  on public.expenses(parent_id)
  where parent_id is not null;

create or replace function public.compute_next_occurrence(
  base_date date,
  recurrence text
)
returns date
language sql
immutable
as $$
  select case
    when recurrence = 'weekly'  then (base_date + interval '1 week')::date
    when recurrence = 'monthly' then (base_date + interval '1 month')::date
    when recurrence = 'yearly'  then (base_date + interval '1 year')::date
    else null
  end;
$$;

create or replace function public.set_next_occurrence()
returns trigger
language plpgsql
as $$
begin
  if new.is_recurring = true and new.recurrence_type is not null then
    if new.next_occurrence is null or new.next_occurrence <= current_date then
      new.next_occurrence := public.compute_next_occurrence(
        coalesce(new.expense_date, current_date),
        new.recurrence_type
      );
    end if;
  else
    new.next_occurrence := null;
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_set_next_occurrence on public.expenses;
create trigger expenses_set_next_occurrence
  before insert or update on public.expenses
  for each row execute function public.set_next_occurrence();

-- Backfill: gastos existentes recurrentes sin next_occurrence
update public.expenses
set next_occurrence = public.compute_next_occurrence(expense_date, recurrence_type)
where is_recurring = true
  and next_occurrence is null
  and recurrence_type is not null;

-- Generador. Lo llama el cron diario con service-role. SECURITY DEFINER
-- para poder escribir en cualquier workspace sin pasar por RLS.
create or replace function public.generate_recurring_expenses()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_count int := 0;
  rec record;
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
    -- Loop interno: si el next_occurrence quedó muy atrasado (ej. el
    -- cron no corrió por una semana), generamos todas las que falten.
    guard := 0;
    while rec.next_occurrence <= current_date and guard < 60 loop
      insert into public.expenses (
        user_id, workspace_id, category_id, amount, currency, description,
        expense_date, due_date, is_recurring, recurrence_type, paid,
        notify_contact_ids, parent_id
      ) values (
        rec.user_id, rec.workspace_id, rec.category_id, rec.amount, rec.currency,
        rec.description, rec.next_occurrence,
        case when rec.due_date is not null then rec.next_occurrence else null end,
        false, null, false,
        rec.notify_contact_ids, rec.id
      );

      rec.next_occurrence := public.compute_next_occurrence(rec.next_occurrence, rec.recurrence_type);
      generated_count := generated_count + 1;
      guard := guard + 1;
    end loop;

    update public.expenses
      set next_occurrence = rec.next_occurrence
      where id = rec.id;
  end loop;

  return generated_count;
end;
$$;

revoke all on function public.generate_recurring_expenses() from public;
