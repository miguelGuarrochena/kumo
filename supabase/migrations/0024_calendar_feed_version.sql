-- Versión del token del feed ICS de Google Calendar.
-- Al incrementar, los links anteriores dejan de funcionar.

alter table public.user_settings
  add column if not exists calendar_feed_version integer not null default 0;

comment on column public.user_settings.calendar_feed_version is
  'Incrementar invalida links previos del feed /api/calendar/feed';
