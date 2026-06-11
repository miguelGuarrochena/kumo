-- Conexión OAuth a Google Calendar (sync Kumo → Google vía API).

alter table public.user_settings
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_connected_at timestamptz,
  add column if not exists google_calendar_last_sync_at timestamptz,
  add column if not exists google_calendar_sync_error text;

comment on column public.user_settings.google_calendar_refresh_token is
  'Refresh token cifrado (AES). Solo lectura server-side con service role.';
comment on column public.user_settings.google_calendar_connected_at is
  'Cuándo el usuario autorizó Google Calendar.';
comment on column public.user_settings.google_calendar_last_sync_at is
  'Última sync exitosa a Google Calendar.';
comment on column public.user_settings.google_calendar_sync_error is
  'Último error de sync (null si OK).';

create table if not exists public.google_calendar_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  kumo_type text not null check (kumo_type in ('reminder', 'expense')),
  kumo_id uuid not null,
  google_event_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kumo_type, kumo_id)
);

create index if not exists google_calendar_events_user_idx
  on public.google_calendar_events (user_id);

alter table public.google_calendar_events enable row level security;

create policy "Users read own google calendar events"
  on public.google_calendar_events for select
  using (user_id = auth.uid());

create policy "Users manage own google calendar events"
  on public.google_calendar_events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
