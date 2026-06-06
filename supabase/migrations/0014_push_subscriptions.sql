-- Web Push subscriptions: un user puede tener varias (mobile, desktop, etc).
-- El endpoint único de la suscripción es el identificador natural.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_self_read" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_self_write" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_self_delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());
