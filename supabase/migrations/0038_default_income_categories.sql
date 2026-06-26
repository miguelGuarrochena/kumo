-- Kumo · Categorías de ingreso por defecto (Sueldo, Freelance, Venta, etc.)
-- 0) Eliminar la restricción legacy (user_id, name) que impedía repetir un
--    nombre entre gasto e ingreso (ej. "Otros"). La unicidad correcta ya la
--    da el índice `categories_name_uniq` (workspace_id, kind, lower(name)).
-- 1) El trigger de alta de usuario ahora siembra también categorías de ingreso.
-- 2) Sembramos las categorías de ingreso en los workspaces ya existentes.

-- =========================================================================
-- 0) Quitar restricción de unicidad vieja por (user_id, name)
-- =========================================================================
alter table public.categories drop constraint if exists categories_user_id_name_key;
-- Por si en algún entorno se llamó distinto (variantes históricas):
alter table public.categories drop constraint if exists categories_user_id_name_unique;

-- =========================================================================
-- 1) Trigger handle_new_user: agrega categorías de ingreso
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  begin
    insert into public.workspaces (name, owner_id)
      values ('Mi espacio', new.id)
      returning id into ws_id;
  exception when others then return new;
  end;

  begin
    insert into public.workspace_members (workspace_id, user_id, role)
      values (ws_id, new.id, 'admin');
  exception when others then end;

  begin
    insert into public.categories (workspace_id, user_id, name, icon, color, kind) values
      (ws_id, new.id, 'Alquiler',     'home',            'sky',      'expense'),
      (ws_id, new.id, 'Supermercado', 'shopping-cart',   'mint',     'expense'),
      (ws_id, new.id, 'Servicios',    'zap',             'peach',    'expense'),
      (ws_id, new.id, 'Transporte',   'car',             'lavender', 'expense'),
      (ws_id, new.id, 'Salud',        'heart',           'rose',     'expense'),
      (ws_id, new.id, 'Otros',        'more-horizontal', 'slate',    'expense'),
      (ws_id, new.id, 'Sueldo',       'briefcase',       'mint',     'income'),
      (ws_id, new.id, 'Freelance',    'sparkles',        'sky',      'income'),
      (ws_id, new.id, 'Venta',        'credit-card',     'peach',    'income'),
      (ws_id, new.id, 'Inversiones',  'piggy-bank',      'lavender', 'income'),
      (ws_id, new.id, 'Regalo',       'gift',            'rose',     'income'),
      (ws_id, new.id, 'Otros',        'more-horizontal', 'slate',    'income');
  exception when others then end;

  begin
    insert into public.user_settings (user_id, workspace_id) values (new.id, ws_id)
      on conflict (user_id) do nothing;
  exception when others then end;

  begin
    insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
      values (ws_id, new.id, 'Yo', 'self', true);
  exception when others then end;

  begin
    insert into public.subscriptions (user_id, status, trial_ends_at)
      values (new.id, 'free', null)
      on conflict (user_id) do nothing;
  exception when others then end;

  return new;
end;
$$;

-- =========================================================================
-- 2) Workspaces existentes: sembrar categorías de ingreso que falten
-- =========================================================================
insert into public.categories (workspace_id, user_id, name, icon, color, kind)
select w.id, w.owner_id, c.name, c.icon, c.color, 'income'
from public.workspaces w
cross join (values
  ('Sueldo',      'briefcase',       'mint'),
  ('Freelance',   'sparkles',        'sky'),
  ('Venta',       'credit-card',     'peach'),
  ('Inversiones', 'piggy-bank',      'lavender'),
  ('Regalo',      'gift',            'rose'),
  ('Otros',       'more-horizontal', 'slate')
) as c(name, icon, color)
where not exists (
  select 1 from public.categories ex
  where ex.workspace_id = w.id
    and ex.kind = 'income'
    and lower(trim(ex.name)) = lower(trim(c.name))
);
