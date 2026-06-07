-- =========================================================================
-- 0020_multi_user_self_contacts.sql
--
-- Permite que cada miembro de un workspace tenga su propio contacto "Yo"
-- (notification_contacts.is_self = true). Hasta acá había un unique index a
-- nivel workspace que limitaba a UN contacto self total, lo cual rompía la
-- experiencia en workspaces compartidos: el segundo usuario que entraba no
-- aparecía en el dropdown "Quién pagó" al dividir un gasto.
--
-- Cambios:
--   1. Drop del unique index "un self por workspace".
--   2. Nuevo unique index "un self por (workspace_id, user_id)" — así cada
--      user puede tener su Yo en cada workspace al que pertenece.
--   3. Backfill: para cada (workspace, miembro) sin contacto self propio,
--      le creamos uno con name "Yo".
-- =========================================================================

-- 1) Sacar el constraint viejo (era idempotente con `if exists` en 0010)
drop index if exists public.notification_contacts_self_uniq;

-- 2) Nuevo unique constraint por (workspace_id, user_id) para self=true
create unique index if not exists notification_contacts_user_self_uniq
  on public.notification_contacts(workspace_id, user_id)
  where is_self = true;

-- 3) Backfill: crear contacto "Yo" para cada miembro de workspaces que aún
--    no tenga uno propio. Eso cubre los usuarios que ya aceptaron una
--    invitación antes de esta migración.
insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
select
  wm.workspace_id,
  wm.user_id,
  'Yo',
  'self',
  true
from public.workspace_members wm
where not exists (
  select 1
  from public.notification_contacts nc
  where nc.workspace_id = wm.workspace_id
    and nc.user_id = wm.user_id
    and nc.is_self = true
)
on conflict do nothing;
