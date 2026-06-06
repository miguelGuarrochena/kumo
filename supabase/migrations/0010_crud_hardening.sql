-- Hardening de CRUDs: previene duplicados, hace deletes robustos y limpia
-- estado inconsistente acumulado por bugs viejos.

-- 1) Limpiar duplicados existentes ANTES de aplicar uniques (sino la
--    migración explota).

-- Contactos "Yo" duplicados por workspace: nos quedamos con el más viejo.
with ranked as (
  select id,
         row_number() over (partition by workspace_id order by created_at asc, id asc) as rn
  from public.notification_contacts
  where is_self = true
)
delete from public.notification_contacts
where id in (select id from ranked where rn > 1);

-- Categorías duplicadas (mismo workspace + mismo nombre): nos quedamos con
-- la más vieja. Si hay expenses apuntando a las duplicadas, las re-apuntamos
-- a la que sobrevive ANTES de borrar.
with ranked as (
  select id,
         workspace_id,
         lower(trim(name)) as norm_name,
         row_number() over (
           partition by workspace_id, lower(trim(name))
           order by created_at asc, id asc
         ) as rn
  from public.categories
),
keepers as (
  select workspace_id, norm_name, id as keep_id
  from ranked where rn = 1
),
losers as (
  select id, workspace_id, norm_name
  from ranked where rn > 1
)
update public.expenses e
   set category_id = k.keep_id
  from losers l
  join keepers k
    on k.workspace_id = l.workspace_id
   and k.norm_name    = l.norm_name
 where e.category_id = l.id;

with ranked as (
  select id,
         row_number() over (
           partition by workspace_id, lower(trim(name))
           order by created_at asc, id asc
         ) as rn
  from public.categories
)
delete from public.categories
where id in (select id from ranked where rn > 1);

-- Invitaciones pendientes duplicadas (mismo workspace + mismo email): nos
-- quedamos con la más reciente, así el link compartido sigue válido.
with pending as (
  select id, workspace_id, lower(email) as norm_email, created_at
  from public.workspace_invites
  where accepted_at is null
),
ranked as (
  select id,
         row_number() over (
           partition by workspace_id, norm_email
           order by created_at desc, id desc
         ) as rn
  from pending
)
delete from public.workspace_invites
where id in (select id from ranked where rn > 1);

-- Espacios huérfanos (sin members) — no deberían existir, pero por las dudas.
delete from public.workspaces ws
where not exists (
  select 1 from public.workspace_members wm where wm.workspace_id = ws.id
);

-- 2) Aplicar uniques para PREVENIR futuros duplicados.

create unique index if not exists notification_contacts_self_uniq
  on public.notification_contacts(workspace_id)
  where is_self = true;

create unique index if not exists categories_name_uniq
  on public.categories(workspace_id, lower(trim(name)));

create unique index if not exists workspace_invites_pending_uniq
  on public.workspace_invites(workspace_id, lower(email))
  where accepted_at is null;

-- 3) RPC SECURITY DEFINER para borrar un workspace de manera bullet-proof.
--    El issue con el delete vía cliente: si una sola fila hija falla por RLS,
--    el cascade puede comportarse raro. Centralizamos en una función con los
--    privilegios necesarios y validación explícita.

create or replace function public.delete_workspace_safe(ws_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owner uuid;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select owner_id into owner from public.workspaces where id = ws_id;
  if owner is null then
    raise exception 'Espacio no encontrado';
  end if;
  if owner <> uid then
    raise exception 'Solo el dueño puede eliminar el espacio';
  end if;

  delete from public.workspaces where id = ws_id;
end;
$$;

revoke all on function public.delete_workspace_safe(uuid) from public;
grant execute on function public.delete_workspace_safe(uuid) to authenticated;

-- 4) RPC para crear el workspace inicial de manera idempotente. Si el user
--    ya tiene espacios, devuelve el primero en vez de crear otro.

create or replace function public.bootstrap_workspace_safe(ws_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing uuid;
  new_ws uuid;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  select wm.workspace_id into existing
  from public.workspace_members wm
  where wm.user_id = uid
  order by wm.joined_at asc
  limit 1;

  if existing is not null then
    return existing;
  end if;

  insert into public.workspaces (name, owner_id)
    values (coalesce(nullif(trim(ws_name), ''), 'Mi espacio'), uid)
    returning id into new_ws;

  insert into public.workspace_members (workspace_id, user_id, role)
    values (new_ws, uid, 'admin');

  insert into public.categories (workspace_id, user_id, name, icon, color) values
    (new_ws, uid, 'Alquiler',        'home',            'sky'),
    (new_ws, uid, 'Supermercado',    'shopping-cart',   'mint'),
    (new_ws, uid, 'Servicios',       'zap',             'peach'),
    (new_ws, uid, 'Transporte',      'car',             'lavender'),
    (new_ws, uid, 'Salud',           'heart',           'rose'),
    (new_ws, uid, 'Otros',           'more-horizontal', 'slate')
  on conflict do nothing;

  insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
    values (new_ws, uid, 'Yo', 'self', true)
  on conflict do nothing;

  insert into public.user_settings (user_id, workspace_id) values (uid, new_ws)
    on conflict (user_id) do nothing;

  return new_ws;
end;
$$;

revoke all on function public.bootstrap_workspace_safe(text) from public;
grant execute on function public.bootstrap_workspace_safe(text) to authenticated;
