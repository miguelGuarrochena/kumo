-- Si un user canceló pero todavía está dentro del período que ya pagó,
-- sigue siendo Pro hasta esa fecha. Así honoramos los Términos:
-- "Mantenés Pro hasta el final del período actual. Después pasás a Free".

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
        or (s.status = 'trialing' and s.trial_ends_at  > now())
        or (s.status = 'canceled' and s.current_period_end > now())
      )
  );
$$;
