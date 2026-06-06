-- Corré esto en Supabase SQL Editor para verificar si las migraciones
-- 0010/0015 están aplicadas y para limpiar duplicados manualmente.

-- 1) ¿Existe el unique de contactos "Yo"?
select indexname from pg_indexes
where tablename = 'notification_contacts'
  and indexname = 'notification_contacts_self_uniq';
-- Si devuelve 0 filas: NO está aplicada la migración 0010.

-- 2) ¿Existe el unique de workspace name?
select indexname from pg_indexes
where tablename = 'workspaces'
  and indexname = 'workspaces_owner_name_uniq';
-- Si devuelve 0 filas: NO está aplicada la migración 0015.

-- 3) Contar duplicados "Yo" por workspace
select workspace_id, count(*) as dups
from public.notification_contacts
where is_self = true
group by workspace_id
having count(*) > 1;

-- 4) Limpieza manual (forzada) — corré esto si los dups siguen ahí:
with ranked as (
  select id,
         workspace_id,
         row_number() over (
           partition by workspace_id
           order by created_at asc, id asc
         ) as rn
  from public.notification_contacts
  where is_self = true
)
delete from public.notification_contacts
where id in (select id from ranked where rn > 1);
