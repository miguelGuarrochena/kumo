-- Registro de aceptación de términos al iniciar checkout de complementos de pago.

create table if not exists public.billing_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  plan_product text not null check (plan_product in ('ocr', 'wa', 'bundle')),
  billing_interval text not null check (billing_interval in ('monthly', 'year', 'year_auto')),
  mp_preapproval_id text,
  accepted_at timestamptz not null default now()
);

create index billing_terms_acceptances_user_idx
  on public.billing_terms_acceptances (user_id, accepted_at desc);

alter table public.billing_terms_acceptances enable row level security;

drop policy if exists "billing_terms_self_read" on public.billing_terms_acceptances;
create policy "billing_terms_self_read" on public.billing_terms_acceptances
  for select using (user_id = auth.uid());

create or replace function public.record_billing_terms_acceptance(
  p_terms_version text,
  p_plan_product text,
  p_billing_interval text,
  p_mp_preapproval_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.billing_terms_acceptances (
    user_id, terms_version, plan_product, billing_interval, mp_preapproval_id
  )
  values (
    auth.uid(), p_terms_version, p_plan_product, p_billing_interval, p_mp_preapproval_id
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.record_billing_terms_acceptance(text, text, text, text) from public;
grant execute on function public.record_billing_terms_acceptance(text, text, text, text) to authenticated;
