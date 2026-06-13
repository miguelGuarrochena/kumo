-- =========================================================================
-- BUDGETS (presupuestos mensuales por categoría)
-- =========================================================================
-- Un presupuesto define un tope de gasto mensual. Puede ser:
--   - por categoría  (category_id no nulo)
--   - total del mes  (category_id nulo)
-- El "gasto del mes" se calcula en vivo desde expenses; acá solo guardamos
-- el tope. Mensual recurrente: aplica a cada mes (no se almacena período).
-- =========================================================================

create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id  uuid references public.categories(id) on delete cascade,
  amount       numeric(14,2) not null check (amount >= 0),
  currency     text not null default 'ARS',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists budgets_ws_idx on public.budgets(workspace_id);

-- Un presupuesto por categoría por workspace; y uno solo "total" (category_id null).
create unique index if not exists budgets_ws_cat_uniq
  on public.budgets(workspace_id, category_id)
  where category_id is not null;
create unique index if not exists budgets_ws_overall_uniq
  on public.budgets(workspace_id)
  where category_id is null;

-- RLS: leen los miembros, escriben los admins (mismo patrón que categories).
alter table public.budgets enable row level security;

create policy "budgets_member_read" on public.budgets
  for select using (public.is_workspace_member(workspace_id));
create policy "budgets_admin_insert" on public.budgets
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "budgets_admin_update" on public.budgets
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "budgets_admin_delete" on public.budgets
  for delete using (public.is_workspace_admin(workspace_id));
