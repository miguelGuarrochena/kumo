-- =========================================================================
-- RPC: get_workspace_members(workspace_id)
--
-- Devuelve la lista de miembros de un workspace con email + full_name
-- traídos de auth.users. SECURITY DEFINER porque auth.users no es
-- accesible desde el cliente normal (RLS estricta de Supabase).
--
-- Verifica adentro que el caller sea miembro del workspace antes de
-- exponer los datos — sin esto, cualquiera podría enumerar emails.
-- =========================================================================

create or replace function public.get_workspace_members(ws_id uuid)
returns table (
  user_id    uuid,
  role       public.workspace_role,
  joined_at  timestamptz,
  email      text,
  full_name  text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Solo miembros pueden ver la lista
  if not public.is_workspace_member(ws_id) then
    raise exception 'No autorizado';
  end if;

  return query
    select
      wm.user_id,
      wm.role,
      wm.joined_at,
      au.email::text,
      coalesce(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')::text as full_name
    from public.workspace_members wm
    join auth.users au on au.id = wm.user_id
    where wm.workspace_id = ws_id
    order by wm.joined_at asc;
end;
$$;

-- Permitir que cualquier autenticado lo invoque (la function se autoprotege)
revoke all on function public.get_workspace_members(uuid) from public;
grant execute on function public.get_workspace_members(uuid) to authenticated;
