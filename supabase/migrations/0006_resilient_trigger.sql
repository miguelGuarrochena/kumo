-- =========================================================================
-- FIX: trigger handle_new_user que NO rolling-back el signup si algo falla
--
-- Problema: si el trigger falla por cualquier razón (RLS, FK, etc), el
-- INSERT en auth.users se roll-back y el usuario queda en limbo: la sesión
-- de Supabase apunta a un user que no existe, así que cada request lo
-- redirige a /auth/login (loop infinito).
--
-- Solución: envolvemos cada paso en EXCEPTION WHEN OTHERS para que el
-- signup SIEMPRE sea exitoso. Si algo falla, lo logueamos pero seguimos.
-- El user creará su workspace después en el cliente (auto-recovery o
-- pantalla de setup).
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
  begin
    insert into public.workspaces (name, owner_id)
      values ('Mi espacio', new.id)
      returning id into ws_id;
  exception when others then
    raise warning 'handle_new_user: workspace insert failed: %', sqlerrm;
    return new;
  end;

  begin
    insert into public.workspace_members (workspace_id, user_id, role)
      values (ws_id, new.id, 'admin');
  exception when others then
    raise warning 'handle_new_user: member insert failed: %', sqlerrm;
  end;

  -- 2) Categorías default
  begin
    insert into public.categories (workspace_id, user_id, name, icon, color) values
      (ws_id, new.id, 'Alquiler',     'home',         'sky'),
      (ws_id, new.id, 'Supermercado', 'shopping-cart','mint'),
      (ws_id, new.id, 'Servicios',    'zap',          'peach'),
      (ws_id, new.id, 'Transporte',   'car',          'lavender'),
      (ws_id, new.id, 'Salud',        'heart',        'rose'),
      (ws_id, new.id, 'Otros',        'more-horizontal','slate');
  exception when others then
    raise warning 'handle_new_user: categories insert failed: %', sqlerrm;
  end;

  -- 3) user_settings
  begin
    insert into public.user_settings (user_id, workspace_id) values (new.id, ws_id)
      on conflict (user_id) do nothing;
  exception when others then
    raise warning 'handle_new_user: user_settings insert failed: %', sqlerrm;
  end;

  -- 4) Contacto "Yo"
  begin
    insert into public.notification_contacts (workspace_id, user_id, name, relationship, is_self)
      values (ws_id, new.id, 'Yo', 'self', true);
  exception when others then
    raise warning 'handle_new_user: notification_contacts insert failed: %', sqlerrm;
  end;

  return new;
end;
$$;

-- Aseguramos que el trigger esté activo
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
