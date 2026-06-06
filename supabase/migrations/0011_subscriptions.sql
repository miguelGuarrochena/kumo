-- Subscripciones: trial 90 días al signup, despues Pro (USD 3/mes) o se quedan
-- en free con features básicas (sin OCR de tickets, sin WhatsApp notif).

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'free'
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status  public.subscription_status not null default 'trialing',

  trial_ends_at timestamptz,
  current_period_end timestamptz,

  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  stripe_price_id        text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_status_idx on public.subscriptions(status);
create index subscriptions_trial_idx  on public.subscriptions(trial_ends_at) where status = 'trialing';

alter table public.subscriptions enable row level security;

create policy "subscriptions_self_read" on public.subscriptions
  for select using (user_id = auth.uid());

-- Backfill: cada user existente arranca con trial 90 días desde hoy.
insert into public.subscriptions (user_id, status, trial_ends_at)
select id, 'trialing'::public.subscription_status, now() + interval '90 days'
from auth.users
on conflict (user_id) do nothing;

-- Trigger en handle_new_user: cuando se crea un user nuevo, también le
-- creamos su sub con trial 90 días. Lo agregamos al trigger existente.

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
      values (new.id, 'trialing', now() + interval '90 days')
      on conflict (user_id) do nothing;
  exception when others then end;

  return new;
end;
$$;

-- Helper: ¿este user tiene acceso Pro? (trial activo o sub paga)
create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and (
        s.status = 'active'
        or (s.status = 'trialing' and s.trial_ends_at > now())
      )
  );
$$;

grant execute on function public.is_pro(uuid) to authenticated;
