-- Kumo · Onboarding flag
-- Marca si el usuario completó el flujo de onboarding inicial (o lo saltó).

alter table public.user_settings
  add column if not exists onboarded boolean not null default false;

-- Marcar como onboarded a usuarios viejos que ya tienen gastos cargados
update public.user_settings us
set onboarded = true
where exists (select 1 from public.expenses e where e.user_id = us.user_id);
