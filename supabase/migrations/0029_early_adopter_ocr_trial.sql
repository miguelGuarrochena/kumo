-- Early adopters: 3 meses de OCR gratis (solo escaneo, sin WhatsApp automático).
-- Aplica a usuarios registrados ANTES del lanzamiento del modelo de 3 planes.
-- No pisa quien ya paga por MercadoPago ni trials OCR todavía vigentes.

-- Fecha de corte: usuarios con created_at antes de esto reciben el beneficio.
-- Ajustá si deployás en otra fecha.
do $$
declare
  cutoff timestamptz := '2026-06-11T03:00:00+00:00'; -- 11-jun-2026 00:00 ART
begin
  -- Filas de suscripción existentes sin pago MP
  update public.subscriptions s
  set
    status = 'trialing',
    plan_type = 'ocr',
    trial_ends_at = now() + interval '90 days',
    updated_at = now()
  from auth.users u
  where s.user_id = u.id
    and u.created_at < cutoff
    and s.provider_subscription_id is null
    and (
      s.status = 'free'
      or (s.status = 'trialing' and (s.trial_ends_at is null or s.trial_ends_at <= now()))
      or (s.status = 'canceled' and (s.current_period_end is null or s.current_period_end <= now()))
    );

  -- Usuarios viejos sin fila en subscriptions (edge case)
  insert into public.subscriptions (user_id, status, plan_type, trial_ends_at)
  select u.id, 'trialing', 'ocr', now() + interval '90 days'
  from auth.users u
  left join public.subscriptions s on s.user_id = u.id
  where u.created_at < cutoff
    and s.user_id is null
  on conflict (user_id) do nothing;
end $$;
