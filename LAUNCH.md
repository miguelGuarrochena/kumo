# Lanzamiento Beta — Checklist

Lo que hay que correr manualmente antes de mandarles el link a tus familiares.

## 1. Local: dependencias nuevas

```bash
pnpm install
```

Agrega `web-push` y `@types/web-push` (push notifications).

## 2. Generar VAPID keys (una sola vez)

```bash
npx web-push generate-vapid-keys
```

Te imprime dos strings. Las guardás en env (paso 3).

## 3. Env vars en Vercel + `.env.local`

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend (emails)
RESEND_API_KEY=re_...

# Gemini OCR
GEMINI_API_KEY=AIza...

# Meta WhatsApp Cloud
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# MercadoPago
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
MP_PLAN_MONTHLY=2c9380...
MP_PLAN_YEARLY=2c9380...

# Web Push (paso 2)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:info@kumo-app.com

# Pricing display
NEXT_PUBLIC_PRICE_MONTHLY=ARS 3.500
NEXT_PUBLIC_PRICE_YEARLY=ARS 35.000
NEXT_PUBLIC_PRICE_YEARLY_PCT=17

# Donaciones
NEXT_PUBLIC_DONATE_URL=https://cafecito.app/miguelguarrochena

# Cron
CRON_SECRET=<algo-largo-aleatorio>

# Monitoring (opcional)
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

## 4. Supabase: aplicar migraciones en orden

```
0001_init.sql
0002_contacts.sql
0003_onboarding.sql
0003_shopping_unit.sql
0004_workspaces.sql
0005_workspace_bootstrap.sql
0006_resilient_trigger.sql
0007_workspace_members_rpc.sql
0008_workspace_icon_color.sql
0009_delete_account.sql
0010_crud_hardening.sql
0011_subscriptions.sql
0012_billing_provider.sql
0013_recurring_expenses.sql
0014_push_subscriptions.sql
0015_workspace_name_unique.sql
```

Verificá con `scripts/check-dups-supabase.sql` que los uniques quedaron.

## 5. MercadoPago: crear planes

```bash
export MP_ACCESS_TOKEN="APP_USR-..."
bash scripts/create-mp-plans.sh
```

Pegá los IDs que imprime en `MP_PLAN_MONTHLY` y `MP_PLAN_YEARLY`.

## 6. MercadoPago: webhook

Panel MP → tu app → Webhooks → "Configurar notificaciones":
- URL: `https://kumo-app.com/api/billing/webhook`
- Eventos: `subscription_preapproval`, `subscription_authorized_payment`
- Copiá la **Clave Secreta** → va en `MP_WEBHOOK_SECRET`.

## 7. Resend: verificar dominio

Panel Resend → Domains → Agregar `kumo-app.com`. Configurar los DNS records (DKIM, SPF, DMARC) en tu provider. Sin esto, los emails de magic link e invitaciones caen en spam.

## 8. WhatsApp Meta producción

Mientras esperás la aprobación de Meta:
- El número está en modo test → solo manda a 5 contactos que agregás manualmente.
- Push notifications cubre las notificaciones para todos los demás.

Para pasar a producción:
1. Meta Business Manager → verificar WhatsApp Business Account (~5 días).
2. Pasar número de test → producción.
3. Crear y aprobar templates de mensajes (~24-48h por template).

## 9. Vercel: crons

`vercel.json` ya tiene los dos crons (`/api/notify` 9am UTC, `/api/cron/recurring` 3am UTC). Vercel los activa automáticamente con `CRON_SECRET` en env.

Verificá en Vercel → Settings → Cron Jobs.

## 10. Deploy

```bash
git push origin main
```

Vercel buildea y deploya. Si typecheck/build falla, mirá los logs.

## 11. Smoke test (5 min)

1. Andá a `https://kumo-app.com/api/billing/health` (logueado) → todos los env deben ser `true`.
2. Settings → Plan → Suscribirme con la tarjeta de prueba MP: `5031 7557 3453 0604`, CVV 123, vto 11/30, DNI 12345678, nombre `APRO`.
3. Volvés a settings → ves "Suscripción activa".
4. Settings → Notificaciones → "Activar notificaciones" → permitir → "Mandar prueba" → te llega notif.
5. Expenses → click cámara → subir foto de un ticket → ves datos extraídos.

Si los 5 pasos funcionan, **andá a compartir el link**.

## 12. Mandar a familiares

> "Hola, armé una app para llevar las cuentas: https://kumo-app.com
>
> Tenés 90 días gratis del plan Pro. Cualquier feedback me ayuda. Gracias!"

Si tu cuenta WhatsApp todavía está en test, agregale los números de tus familiares en Meta panel → "Recipients" para que reciban las notificaciones.
