-- Columnas provider-agnostic para que mañana puedas sumar otro PSP (LemonSqueezy,
-- Paddle) sin tocar el schema. Hoy: MercadoPago.

alter table public.subscriptions
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_price_id;

alter table public.subscriptions
  add column if not exists provider                 text not null default 'mercadopago',
  add column if not exists provider_customer_id     text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_variant_id      text;

create unique index if not exists subscriptions_provider_customer_uniq
  on public.subscriptions(provider, provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_uniq
  on public.subscriptions(provider, provider_subscription_id)
  where provider_subscription_id is not null;
