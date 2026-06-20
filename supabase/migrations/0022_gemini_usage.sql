-- =========================================================================
-- 0022_gemini_usage.sql
--
-- Registramos una fila por cada llamada a Gemini (OCR o NLP de búsqueda)
-- con el costo USD estimado. Sirve para que el admin de Kumo vea consumo
-- en /admin y para disparar alertas por email cuando se cruza un umbral.
--
-- Distinto de `ocr_usage` (0017) que era un counter agregado por mes para
-- caps de trial — acá guardamos cada llamada para poder estimar dinero.
-- =========================================================================

create table if not exists public.gemini_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('ocr', 'nlp')),
  est_cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gemini_usage_created_idx
  on public.gemini_usage(created_at desc);

create index if not exists gemini_usage_user_idx
  on public.gemini_usage(user_id);

alter table public.gemini_usage enable row level security;

-- Nadie lee directamente la tabla — solo el service role (admin + cron).
-- No definimos policy explícita: con RLS on y sin policies, nadie autenticado puede leerla.
