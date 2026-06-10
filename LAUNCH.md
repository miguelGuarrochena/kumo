# Lanzamiento — Checklist

Lo que hay que tener listo antes de compartir Kumo.

## Modelo de negocio

- **Gratis**: gastos, recordatorios, calendario, compras, dividir, espacios, WhatsApp, push.
- **De pago (opcional)**: escaneo OCR de tickets (Google Gemini) — se activa al tocar "Escanear ticket".
- **Sin trial automático** al registrarse (migración `0023`).

## 1. Env vars en Vercel + `.env.local`

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://kumo-app.com

# Resend (emails magic link)
RESEND_API_KEY=re_...

# OCR (Google Gemini)
GOOGLE_AI_API_KEY=AIza...

# Meta WhatsApp Cloud (opcional hasta aprobación)
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...

# MercadoPago (solo complemento OCR)
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
MP_PLAN_MONTHLY=2c9380...
MP_PLAN_YEARLY=2c9380...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:info@kumo-app.com

# Pricing display
NEXT_PUBLIC_PRICE_MONTHLY=ARS 3.500
NEXT_PUBLIC_PRICE_YEARLY=ARS 35.000
NEXT_PUBLIC_PRICE_YEARLY_PCT=17

# Donaciones
NEXT_PUBLIC_DONATE_URL=https://cafecito.app/miguelguarrochena

# Cron + feeds firmados
CRON_SECRET=<algo-largo-aleatorio>

# WhatsApp: mostrar banner "en revisión" aunque tengas credenciales (hasta aprobación Meta)
NEXT_PUBLIC_WHATSAPP_PENDING=true

# Monitoring (opcional)
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

> **WhatsApp opcional**: si faltan `WHATSAPP_*`, el cron `/api/notify` sigue mandando **push** y omite WhatsApp.

## 2. Supabase: migraciones

Aplicar todas en orden hasta `0024_calendar_feed_version.sql`:

```bash
supabase db push
```

## 3. MercadoPago (OCR)

```bash
export MP_ACCESS_TOKEN="APP_USR-..."
bash scripts/create-mp-plans.sh
```

Webhook: `https://kumo-app.com/api/billing/webhook` → eventos `subscription_preapproval`, `subscription_authorized_payment`.

## 4. Resend

Verificar dominio `kumo-app.com` (DKIM, SPF, DMARC) para magic links.

## 5. WhatsApp Meta

**Mientras esperás aprobación:**
- Modo test → agregar números en Meta → Recipients.
- Push cubre alertas para el resto.
- Templates requeridos: `kumo_vencimiento`, `kumo_reminder`.

**Producción:**
1. Verificar WhatsApp Business Account en Meta.
2. Aprobar templates (~24–48 h).
3. Pasar número de test a producción.

## 6. Vercel crons

`vercel.json` ejecuta `/api/notify` (9:00 UTC) y `/api/cron/recurring` (3:00 UTC). Requiere `CRON_SECRET`.

## 7. Deploy

```bash
git push origin main
```

## 8. Smoke test

1. `GET /api/billing/health` (logueado) → env críticos en `true`.
2. Gastos → cargar uno manualmente.
3. Configuración → Notificaciones → activar push → mandar prueba.
4. Calendario → crear recordatorio.
5. Configuración → Google Calendar → copiar link y suscribir en Google.
6. Gastos → Escanear ticket → paywall OCR → checkout MP (si querés probar pago).

## 9. Compartir el link

> "Hola, armé Kumo para llevar las cuentas del hogar: https://kumo-app.com
>
> Es gratis (gastos, recordatorios, WhatsApp, push). Si querés escanear tickets con IA, es un complemento opcional. Cualquier feedback me ayuda."

Si WhatsApp sigue en test, agregá los números de tus familiares en Meta → Recipients.
