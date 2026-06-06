-- Previene que un mismo dueño tenga dos espacios con el mismo nombre (case-insensitive).

-- 1) Renombra duplicados existentes para no romper el unique al crearlo.
with ranked as (
  select id,
         owner_id,
         lower(trim(name)) as norm_name,
         row_number() over (
           partition by owner_id, lower(trim(name))
           order by created_at asc, id asc
         ) as rn
  from public.workspaces
)
update public.workspaces ws
set name = ws.name || ' (' || r.rn || ')'
from ranked r
where ws.id = r.id and r.rn > 1;

-- 2) Crea el unique. Esto bloquea inserts/updates que generen duplicados.
create unique index if not exists workspaces_owner_name_uniq
  on public.workspaces(owner_id, lower(trim(name)));
