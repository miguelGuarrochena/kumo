-- =========================================================================
-- FIX: bootstrap de workspaces para usuarios nuevos
--
-- Las policies originales tenían un chicken-and-egg: para leer o crear filas
-- en workspaces/workspace_members el usuario necesitaba YA ser miembro de
-- algún workspace. Pero un usuario flamante no es miembro de nada, por lo
-- tanto no podía crear su primer espacio.
--
-- Esta migración:
--   1. Permite a cualquier autenticado crear un workspace donde él sea owner.
--   2. Permite leer workspaces que YOU OWN (aunque no haya membership todavía).
--   3. Permite leer tu propia fila en workspace_members.
--   4. Permite insertar tu propia fila admin si sos el owner del workspace.
-- =========================================================================

-- ---- workspaces ----
create policy "workspaces_self_insert" on public.workspaces
  for insert with check (owner_id = auth.uid());

drop policy if exists "workspaces_read" on public.workspaces;
create policy "workspaces_read" on public.workspaces
  for select using (
    public.is_workspace_member(id) or owner_id = auth.uid()
  );

-- ---- workspace_members ----
-- Leer: tus propias filas SIEMPRE, o cualquier fila del workspace del que sos miembro.
drop policy if exists "members_read" on public.workspace_members;
create policy "members_read" on public.workspace_members
  for select using (
    user_id = auth.uid() or public.is_workspace_member(workspace_id)
  );

-- Insertar: admin del workspace, O un user creando su propia membership
-- en un workspace del que es owner (bootstrap del primer ingreso).
drop policy if exists "members_admin_insert" on public.workspace_members;
create policy "members_self_or_admin_insert" on public.workspace_members
  for insert with check (
    public.is_workspace_admin(workspace_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.owner_id = auth.uid()
      )
    )
  );

-- ---- Repair: para users existentes sin workspace, crearles uno ----
-- (Esto es idempotente: si ya tienen workspace no hace nada.)
do $$
declare
  u record;
  ws_id uuid;
begin
  for u in
    select au.id
    from auth.users au
    left join public.workspace_members wm on wm.user_id = au.id
    where wm.user_id is null
  loop
    insert into public.workspaces (name, owner_id)
      values ('Mi espacio', u.id)
      returning id into ws_id;

    insert into public.workspace_members (workspace_id, user_id, role)
      values (ws_id, u.id, 'admin');

    insert into public.categories (workspace_id, user_id, name, icon, color) values
      (ws_id, u.id, 'Alquiler',     'home',         'sky'),
      (ws_id, u.id, 'Supermercado', 'shopping-cart','mint'),
      (ws_id, u.id, 'Servicios',    'zap',          'peach'),
      (ws_id, u.id, 'Transporte',   'car',          'lavender'),
      (ws_id, u.id, 'Salud',        'heart',        'rose'),
      (ws_id, u.id, 'Otros',        'more-horizontal', 'slate');

    insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
      values (ws_id, u.id, 'Yo', 'self', true);

    insert into public.user_settings (user_id, workspace_id) values (u.id, ws_id)
      on conflict (user_id) do nothing;
  end loop;
end $$;
