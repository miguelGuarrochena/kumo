-- Uso de WhatsApp automático por usuario/mes (caps de costo Meta).

create table if not exists public.wa_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table public.wa_usage enable row level security;

drop policy if exists "wa_usage_self_read" on public.wa_usage;
create policy "wa_usage_self_read" on public.wa_usage
  for select using (user_id = auth.uid());

create or replace function public.increment_wa_usage(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  m text := to_char(now(), 'YYYY-MM');
  new_count int;
begin
  if p_user_id is null then
    raise exception 'user_id requerido';
  end if;

  insert into public.wa_usage (user_id, month, count)
    values (p_user_id, m, 1)
    on conflict (user_id, month) do update set
      count = public.wa_usage.count + 1,
      updated_at = now()
    returning count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_wa_usage(uuid) from public;
grant execute on function public.increment_wa_usage(uuid) to service_role;

create or replace function public.current_month_wa_count(p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count, 0)
  from public.wa_usage
  where user_id = p_user_id
    and month = to_char(now(), 'YYYY-MM');
$$;

revoke all on function public.current_month_wa_count(uuid) from public;
grant execute on function public.current_month_wa_count(uuid) to service_role;
