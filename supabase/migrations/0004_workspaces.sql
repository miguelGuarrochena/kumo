-- =========================================================================
-- WORKSPACES (multi-usuario)
-- =========================================================================
-- Permite que un grupo de usuarios (pareja, familia) compartan los mismos
-- gastos, recordatorios, lista de compras, etc.
--
-- Cada usuario existente recibe automáticamente un workspace personal
-- ("Mi cuenta") del que es owner + admin único.
--
-- Roles:
--   - admin:  CRUD completo + puede invitar/sacar miembros
--   - reader: SELECT-only (no puede crear, editar ni borrar)
-- =========================================================================

create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi cuenta',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index workspaces_owner_idx on public.workspaces(owner_id);

create type public.workspace_role as enum ('admin', 'reader');

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.workspace_role not null default 'reader',
  invited_by   uuid references auth.users(id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members(user_id);

create table public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email        text not null,
  role         public.workspace_role not null default 'reader',
  token        text not null unique,
  invited_by   uuid references auth.users(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index workspace_invites_token_idx on public.workspace_invites(token);
create index workspace_invites_email_idx on public.workspace_invites(lower(email));

-- =========================================================================
-- ALTER tables existentes: agregar workspace_id (nullable, lo llenamos
-- en el backfill, después lo hacemos NOT NULL).
-- =========================================================================

alter table public.categories             add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.expenses               add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.reminders              add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.shopping_items         add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.user_settings          add column workspace_id uuid references public.workspaces(id) on delete cascade;
alter table public.notification_contacts  add column workspace_id uuid references public.workspaces(id) on delete cascade;

-- =========================================================================
-- BACKFILL: para cada usuario existente, crear su workspace personal
-- y migrar todas sus filas.
-- =========================================================================

do $$
declare
  u record;
  ws_id uuid;
begin
  for u in select id from auth.users loop
    insert into public.workspaces (name, owner_id)
      values ('Mi cuenta', u.id)
      returning id into ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
      values (ws_id, u.id, 'admin');

    update public.categories            set workspace_id = ws_id where user_id = u.id;
    update public.expenses              set workspace_id = ws_id where user_id = u.id;
    update public.reminders             set workspace_id = ws_id where user_id = u.id;
    update public.shopping_items        set workspace_id = ws_id where user_id = u.id;
    update public.user_settings         set workspace_id = ws_id where user_id = u.id;
    update public.notification_contacts set workspace_id = ws_id where user_id = u.id;
  end loop;
end $$;

-- Hacemos workspace_id NOT NULL ahora que todas las filas tienen valor.
alter table public.categories             alter column workspace_id set not null;
alter table public.expenses               alter column workspace_id set not null;
alter table public.reminders              alter column workspace_id set not null;
alter table public.shopping_items         alter column workspace_id set not null;
alter table public.user_settings          alter column workspace_id set not null;
alter table public.notification_contacts  alter column workspace_id set not null;

-- Índices para queries por workspace
create index categories_ws_idx            on public.categories(workspace_id);
create index expenses_ws_idx              on public.expenses(workspace_id);
create index reminders_ws_idx             on public.reminders(workspace_id);
create index shopping_items_ws_idx        on public.shopping_items(workspace_id);
create index notification_contacts_ws_idx on public.notification_contacts(workspace_id);

-- =========================================================================
-- TRIGGER: cuando se crea un nuevo usuario en auth.users, le creamos su
-- workspace personal automáticamente. Esto reemplaza la lógica que antes
-- vivía en el handle_new_user (que solo creaba user_settings + contact "Yo").
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
  -- 1) Workspace personal por default
  insert into public.workspaces (name, owner_id)
    values ('Mi cuenta', new.id)
    returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'admin');

  -- 2) Categorías default
  insert into public.categories (workspace_id, user_id, name, icon, color) values
    (ws_id, new.id, 'Alquiler',     'home',         'sky'),
    (ws_id, new.id, 'Supermercado', 'shopping-cart','mint'),
    (ws_id, new.id, 'Servicios',    'zap',          'peach'),
    (ws_id, new.id, 'Transporte',   'car',          'lavender'),
    (ws_id, new.id, 'Salud',        'heart',        'rose'),
    (ws_id, new.id, 'Entretenimiento', 'gamepad-2', 'sky'),
    (ws_id, new.id, 'Otros',        'circle-dashed','peach');

  -- 3) user_settings vacío
  insert into public.user_settings (user_id, workspace_id) values (new.id, ws_id)
    on conflict (user_id) do nothing;

  -- 4) Contacto "Yo" para que pueda recibir avisos
  insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
    values (ws_id, new.id, 'Yo', 'Yo mismo', true);

  return new;
end;
$$;

-- Reemplazar el trigger (si existía con otra firma)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- ENABLE RLS en las nuevas tablas
-- =========================================================================

alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

-- Función helper: ¿el usuario es miembro del workspace?
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- Función helper: ¿el usuario es admin del workspace?
create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- RLS policies para tablas de workspaces
-- =========================================================================

-- workspaces: miembros pueden ver, solo owner puede update/delete
create policy "workspaces_read" on public.workspaces
  for select using (public.is_workspace_member(id));

create policy "workspaces_owner_write" on public.workspaces
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "workspaces_owner_delete" on public.workspaces
  for delete using (owner_id = auth.uid());

-- workspace_members: miembros leen, admins escriben
create policy "members_read" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

create policy "members_admin_insert" on public.workspace_members
  for insert with check (public.is_workspace_admin(workspace_id));

create policy "members_admin_update" on public.workspace_members
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));

create policy "members_admin_delete" on public.workspace_members
  for delete using (public.is_workspace_admin(workspace_id));

-- workspace_invites: admins ven y crean
create policy "invites_admin_read" on public.workspace_invites
  for select using (public.is_workspace_admin(workspace_id));

create policy "invites_admin_write" on public.workspace_invites
  for all using (public.is_workspace_admin(workspace_id))
          with check (public.is_workspace_admin(workspace_id));

-- =========================================================================
-- RLS policies REESCRITAS para tablas con workspace_id.
-- Antes filtraban por user_id; ahora por membership.
-- READ: cualquier miembro. WRITE: solo admins.
-- =========================================================================

-- categories
drop policy if exists "categories_owner" on public.categories;
create policy "categories_member_read" on public.categories
  for select using (public.is_workspace_member(workspace_id));
create policy "categories_admin_write" on public.categories
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "categories_admin_update" on public.categories
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "categories_admin_delete" on public.categories
  for delete using (public.is_workspace_admin(workspace_id));

-- expenses
drop policy if exists "expenses_owner" on public.expenses;
create policy "expenses_member_read" on public.expenses
  for select using (public.is_workspace_member(workspace_id));
create policy "expenses_admin_write" on public.expenses
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "expenses_admin_update" on public.expenses
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "expenses_admin_delete" on public.expenses
  for delete using (public.is_workspace_admin(workspace_id));

-- reminders
drop policy if exists "reminders_owner" on public.reminders;
create policy "reminders_member_read" on public.reminders
  for select using (public.is_workspace_member(workspace_id));
create policy "reminders_admin_write" on public.reminders
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "reminders_admin_update" on public.reminders
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "reminders_admin_delete" on public.reminders
  for delete using (public.is_workspace_admin(workspace_id));

-- shopping_items
drop policy if exists "shopping_items_owner" on public.shopping_items;
create policy "shopping_items_member_read" on public.shopping_items
  for select using (public.is_workspace_member(workspace_id));
create policy "shopping_items_admin_write" on public.shopping_items
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "shopping_items_admin_update" on public.shopping_items
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "shopping_items_admin_delete" on public.shopping_items
  for delete using (public.is_workspace_admin(workspace_id));

-- user_settings (sigue siendo per-user dentro del workspace)
drop policy if exists "user_settings_owner" on public.user_settings;
create policy "user_settings_self" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notification_contacts
drop policy if exists "notification_contacts_owner" on public.notification_contacts;
create policy "contacts_member_read" on public.notification_contacts
  for select using (public.is_workspace_member(workspace_id));
create policy "contacts_admin_write" on public.notification_contacts
  for insert with check (public.is_workspace_admin(workspace_id));
create policy "contacts_admin_update" on public.notification_contacts
  for update using (public.is_workspace_admin(workspace_id))
              with check (public.is_workspace_admin(workspace_id));
create policy "contacts_admin_delete" on public.notification_contacts
  for delete using (public.is_workspace_admin(workspace_id));
