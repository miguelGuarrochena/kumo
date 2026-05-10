-- Kumo · Schema inicial
-- Postgres 15+ (Supabase). Todo con RLS — cada usuario ve solo lo suyo.

-- =========================================================================
-- CATEGORIES
-- =========================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'wallet',
  -- color usa los nombres del design system: sky, lavender, peach, mint, rose
  color text not null default 'sky',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index categories_user_id_idx on public.categories(user_id);

-- =========================================================================
-- EXPENSES
-- =========================================================================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'ARS',
  description text,
  expense_date date not null default current_date,
  -- vencimiento futuro (alquiler, expensas, suscripciones)
  due_date date,
  is_recurring boolean not null default false,
  recurrence_type text check (recurrence_type in ('weekly', 'monthly', 'yearly')),
  paid boolean not null default true,
  created_at timestamptz not null default now()
);

create index expenses_user_id_idx on public.expenses(user_id);
create index expenses_user_date_idx on public.expenses(user_id, expense_date desc);
create index expenses_due_date_idx on public.expenses(due_date) where due_date is not null and paid = false;

-- =========================================================================
-- REMINDERS (citas médicas, cumpleaños, otros)
-- =========================================================================
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  reminder_date date not null,
  reminder_time time,
  reminder_type text not null default 'generic'
    check (reminder_type in ('medical', 'birthday', 'generic')),
  is_recurring boolean not null default false,
  -- cuántos días antes notificar (default 1 día antes)
  notify_days_before int not null default 1 check (notify_days_before >= 0),
  -- timestamp de la última notificación enviada (para no duplicar)
  last_notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_user_id_idx on public.reminders(user_id);
create index reminders_date_idx on public.reminders(reminder_date);

-- =========================================================================
-- SHOPPING ITEMS
-- =========================================================================
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_name text not null default 'Supermercado',
  name text not null,
  quantity text,
  bought boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index shopping_items_user_list_idx on public.shopping_items(user_id, list_name, position);

-- =========================================================================
-- USER SETTINGS
-- =========================================================================
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whatsapp_number text,
  whatsapp_verified boolean not null default false,
  notify_expenses boolean not null default true,
  notify_reminders boolean not null default true,
  default_currency text not null default 'ARS',
  timezone text not null default 'America/Argentina/Buenos_Aires',
  updated_at timestamptz not null default now()
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.reminders enable row level security;
alter table public.shopping_items enable row level security;
alter table public.user_settings enable row level security;

-- Policies: cada user solo ve/modifica lo suyo
create policy "categories_owner" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "expenses_owner" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminders_owner" on public.reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "shopping_items_owner" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_settings_owner" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- FUNCIONES Y TRIGGERS
-- =========================================================================

-- Crear settings por default cuando se crea un user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);

  -- Categorías default para que arranque con algo
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
