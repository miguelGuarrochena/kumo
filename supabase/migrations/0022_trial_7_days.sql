-- Reemplazado por 0023_no_auto_ocr_trial.sql (sin trial automático). Se mantiene por orden de migraciones.

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
    insert into public.categories (workspace_id, user_id, name, icon, color) values
      (ws_id, new.id, 'Alquiler',     'home',            'sky'),
      (ws_id, new.id, 'Supermercado', 'shopping-cart',   'mint'),
      (ws_id, new.id, 'Servicios',    'zap',             'peach'),
      (ws_id, new.id, 'Transporte',   'car',             'lavender'),
      (ws_id, new.id, 'Salud',        'heart',           'rose'),
      (ws_id, new.id, 'Otros',        'more-horizontal', 'slate');
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
