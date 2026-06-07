-- Trackeo de uso de OCR por user/mes. Permite caps en trial sin tocar
-- la tabla principal de gastos.

create table public.ocr_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,            -- formato 'YYYY-MM'
  count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.ocr_usage enable row level security;

create policy "ocr_usage_self_read" on public.ocr_usage
  for select using (user_id = auth.uid());

-- Incremento atómico vía RPC. El endpoint /api/ocr llama esto cada vez que
-- procesa una imagen exitosamente.
create or replace function public.increment_ocr_usage()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m text := to_char(now(), 'YYYY-MM');
  new_count int;
begin
  if uid is null then raise exception 'No autenticado'; end if;

  insert into public.ocr_usage (user_id, month, count)
    values (uid, m, 1)
    on conflict (user_id, month) do update set
      count = public.ocr_usage.count + 1,
      updated_at = now()
    returning count into new_count;

  return new_count;
end;
$$;

grant execute on function public.increment_ocr_usage() to authenticated;

-- Helper para leer el conteo del mes actual sin incrementar.
create or replace function public.current_month_ocr_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count, 0)
  from public.ocr_usage
  where user_id = auth.uid()
    and month = to_char(now(), 'YYYY-MM');
$$;

grant execute on function public.current_month_ocr_count() to authenticated;
