-- Tipos de plan: OCR, WhatsApp automático, o combo (bundle).
-- Los pagos existentes sin plan_type se tratan como 'ocr' en la app (retrocompat).

alter table public.subscriptions
  add column if not exists plan_type text
    check (plan_type is null or plan_type in ('ocr', 'wa', 'bundle'));

-- Cortesía / lifetime / trials admin → combo completo
update public.subscriptions
set plan_type = 'bundle'
where plan_type is null
  and status in ('active', 'trialing')
  and (provider_subscription_id is null or status = 'trialing');

-- Suscripciones MP activas sin tipo → asumimos OCR (plan anterior)
update public.subscriptions
set plan_type = 'ocr'
where plan_type is null
  and status in ('active', 'canceled')
  and provider_subscription_id is not null;
