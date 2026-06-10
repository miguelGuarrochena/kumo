-- Estado de cobro por participante en un gasto dividido (Gastos).
alter table public.expense_splits
  add column if not exists paid boolean not null default false;
