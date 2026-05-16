-- Kumo · Contactos múltiples para notificaciones
-- Idea: el user puede agregar varios números (esposa, hijos, padres, abuela, etc.)
-- y elegir a quién avisar para cada vencimiento o recordatorio.

-- =========================================================================
-- NOTIFICATION CONTACTS
-- =========================================================================
create table public.notification_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- Formato internacional sin "+": ej. 5491134567890
  phone text,
  relationship text not null default 'other'
    check (relationship in ('self', 'partner', 'child', 'parent', 'sibling', 'friend', 'other')),
  -- "self" es el contacto del propio user. Se crea automático en signup.
  is_self boolean not null default false,
  -- Verificado contra Meta (futuro). Hoy es informativo.
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index notification_contacts_user_idx on public.notification_contacts(user_id);

alter table public.notification_contacts enable row level security;

create policy "notification_contacts_owner" on public.notification_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- Agregar notify_contact_ids a expenses y reminders
-- =========================================================================
alter table public.expenses
  add column if not exists notify_contact_ids uuid[] not null default '{}';

alter table public.reminders
  add column if not exists notify_contact_ids uuid[] not null default '{}';

-- =========================================================================
-- Trigger actualizado: crear contacto "Yo" para el user automaticamente
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);

  -- Contacto propio (heredamos su whatsapp_number si lo tiene seteado)
  insert into public.notification_contacts (user_id, name, relationship, is_self)
  values (new.id, 'Yo', 'self', true);

  insert into public.categories (user_id, name, icon, color) values
    (new.id, 'Alquiler',     'home',         'sky'),
    (new.id, 'Supermercado', 'shopping-cart','mint'),
    (new.id, 'Servicios',    'zap',          'peach'),
    (new.id, 'Transporte',   'car',          'lavender'),
    (new.id, 'Salud',        'heart',        'rose'),
    (new.id, 'Otros',        'more-horizontal','sky');

  return new;
end;
$$;

-- Si ya existen users sin contacto "Yo", crearlo retroactivamente
insert into public.notification_contacts (user_id, name, relationship, is_self, phone)
select
  us.user_id,
  'Yo',
  'self',
  true,
  us.whatsapp_number
from public.user_settings us
where not exists (
  select 1 from public.notification_contacts nc
  where nc.user_id = us.user_id and nc.is_self = true
);
