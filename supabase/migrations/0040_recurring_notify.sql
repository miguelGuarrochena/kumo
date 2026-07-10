-- Kumo · Aviso de gastos recurrentes auto-generados
-- Hasta ahora el cron `generate_recurring_expenses()` creaba las ocurrencias
-- en silencio (solo devolvía un conteo). Ahora:
--   1. Nuevo toggle `notify_recurring` (default true).
--   2. El RPC devuelve las filas generadas para que el cron pueda mandar
--      un push a cada usuario ("se registró tu gasto recurrente X").

alter table public.user_settings
  add column if not exists notify_recurring boolean not null default true;

-- Cambia el tipo de retorno (int → table), así que hay que dropear primero:
-- CREATE OR REPLACE no permite cambiar la firma de retorno.
drop function if exists public.generate_recurring_expenses();

-- Columnas OUT prefijadas con `g_` para no colisionar con las columnas de
-- `expenses` dentro del cuerpo (evita ambigüedad en el UPDATE/INSERT).
create function public.generate_recurring_expenses()
returns table (
  g_id uuid,
  g_user_id uuid,
  g_workspace_id uuid,
  g_description text,
  g_amount numeric,
  g_currency text,
  g_kind text,
  g_expense_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
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

      -- Devolvemos la fila generada para que el cron pueda notificar.
      g_id := new_expense_id;
      g_user_id := rec.user_id;
      g_workspace_id := rec.workspace_id;
      g_description := rec.description;
      g_amount := rec.amount;
      g_currency := rec.currency;
      g_kind := rec.kind;
      g_expense_date := rec.next_occurrence;
      return next;

      rec.next_occurrence := public.compute_next_occurrence(rec.next_occurrence, rec.recurrence_type);
      guard := guard + 1;
    end loop;

    update public.expenses set next_occurrence = rec.next_occurrence where id = rec.id;
  end loop;

  return;
end;
$$;

revoke all on function public.generate_recurring_expenses() from public;
