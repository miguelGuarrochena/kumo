-- =========================================================================
-- RPC: delete_my_account()
--
-- Borra al user actual de auth.users. Las FKs ON DELETE CASCADE limpian:
-- workspaces (donde es owner), workspace_members, expenses, reminders,
-- shopping_items, categorías, notification_contacts, user_settings.
--
-- SECURITY DEFINER porque modificar auth.users requiere privilegios
-- (los users normales no pueden escribir ahí directamente).
-- =========================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  -- El delete cascade a través de FKs limpia todo:
  --   workspaces.owner_id → on delete cascade
  --   workspace_members.user_id → on delete cascade
  --   expenses/reminders/etc. user_id → on delete cascade (vía workspace_id cascade)
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- =========================================================================
-- RPC: cleanup_duplicate_self_contacts(ws_id)
--
-- Mantiene solo UNA fila is_self=true por workspace (la más vieja).
-- Útil para limpiar duplicados generados antes del fix del bootstrap loop.
-- =========================================================================

create or replace function public.cleanup_duplicate_self_contacts(ws_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int := 0;
begin
  if not public.is_workspace_member(ws_id) then
    raise exception 'No autorizado';
  end if;

  with keep as (
    select id
    from public.notification_contacts
    where workspace_id = ws_id and is_self = true
    order by created_at asc
    limit 1
  )
  delete from public.notification_contacts
  where workspace_id = ws_id
    and is_self = true
    and id not in (select id from keep);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_duplicate_self_contacts(uuid) from public;
grant execute on function public.cleanup_duplicate_self_contacts(uuid) to authenticated;
