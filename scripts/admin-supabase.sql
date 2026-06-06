-- =========================================================================
-- Operaciones de administración manual de suscripciones.
-- Pegá la query que necesites en Supabase → SQL Editor → Run.
-- Reemplazá los placeholders ('email@example.com', etc.).
-- =========================================================================

-- 1) VER el estado actual de un user por email
select u.email, u.created_at as signup,
       s.status, s.trial_ends_at, s.current_period_end,
       s.provider, s.provider_subscription_id, s.updated_at
from public.subscriptions s
join auth.users u on u.id = s.user_id
where u.email = 'email@example.com';


-- 2) LISTAR todas las suscripciones activas o en trial
select u.email, s.status, s.trial_ends_at, s.current_period_end
from public.subscriptions s
join auth.users u on u.id = s.user_id
where s.status in ('active', 'trialing', 'canceled')
order by s.updated_at desc;


-- 3) REGALAR Pro a alguien por X meses (sin cobrar)
--    Útil para amigos, betas privadas, soporte, prueba.
update public.subscriptions
set status = 'active',
    current_period_end = now() + interval '3 months',  -- ← cambiá la duración
    updated_at = now()
where user_id = (select id from auth.users where email = 'email@example.com');


-- 4) REGALAR Pro indefinido (lifetime / staff)
update public.subscriptions
set status = 'active',
    current_period_end = '2099-12-31'::timestamptz,
    updated_at = now()
where user_id = (select id from auth.users where email = 'email@example.com');


-- 5) DAR DE BAJA Pro INMEDIATAMENTE (acceso se corta ya)
--    Útil si reembolsaste el pago y querés sacarle acceso al instante.
update public.subscriptions
set status = 'canceled',
    current_period_end = now() - interval '1 second',
    updated_at = now()
where user_id = (select id from auth.users where email = 'email@example.com');


-- 6) DAR DE BAJA Pro al FINAL del período (no le saca acceso pero no se renueva)
--    El user mantiene Pro hasta current_period_end. Después pasa a Free.
update public.subscriptions
set status = 'canceled',
    updated_at = now()
where user_id = (select id from auth.users where email = 'email@example.com');


-- 7) EXTENDER el trial gratis de alguien
update public.subscriptions
set status = 'trialing',
    trial_ends_at = now() + interval '30 days',  -- ← días extra
    updated_at = now()
where user_id = (select id from auth.users where email = 'email@example.com');


-- 8) VER pagos / preapprovals en MercadoPago de un user específico
--    Necesitás el provider_subscription_id (sale del query 1)
--    Después lo buscás en panel MP → Suscripciones → tu cuenta.


-- 9) CONTAR usuarios Pro activos vs Free
select
  count(*) filter (where status = 'active') as active_paid,
  count(*) filter (where status = 'trialing' and trial_ends_at > now()) as in_trial,
  count(*) filter (where status = 'canceled' and current_period_end > now()) as canceled_with_access,
  count(*) filter (where status = 'free' or (status = 'canceled' and current_period_end <= now())) as free
from public.subscriptions;
