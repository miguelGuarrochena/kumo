# Lanzamiento — Checklist

Lo que hay que tener listo antes de compartir Kumo.

## Modelo de negocio

- **Gratis**: gastos, recordatorios, calendario, compras, dividir, espacios, push, export, WhatsApp **manual** (vos enviás desde un recordatorio).
- **De pago (opcional)**:
  - **Escaneo OCR** — Google Gemini al tocar "Escanear ticket".
  - **WhatsApp automático** — Meta cobra por mensaje; Kumo avisa solo vía API.
  - **Kumo Pro (combo)** — OCR + WhatsApp automático a precio menor.
- **Sin trial automático** al registrarse (migración `0023`).
- **Early adopters** (registrados antes del 11-jun-2026): 3 meses OCR gratis vía `0029_early_adopter_ocr_trial.sql`.

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
GOOGLE_AI_MODEL=gemini-2.5-flash-lite

# Google Calendar (OAuth — sync en tiempo real Kumo → Google)
GOOGLE_CALENDAR_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
# Opcional si difiere del default: https://tu-dominio/api/auth/google-calendar/callback
# GOOGLE_CALENDAR_REDIRECT_URI=
# Opcional (cifrado del refresh token; si no, usa CRON_SECRET)
# GOOGLE_CALENDAR_TOKEN_KEY=

# Meta WhatsApp Cloud (opcional hasta aprobación)
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...

# MercadoPago (3 productos × mensual/anual)
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=...
MP_PLAN_OCR_MONTHLY=...
MP_PLAN_OCR_YEARLY=...
MP_PLAN_OCR_YEARLY_AUTO=...
MP_PLAN_WA_MONTHLY=...
MP_PLAN_WA_YEARLY=...
MP_PLAN_WA_YEARLY_AUTO=...
MP_PLAN_BUNDLE_MONTHLY=...
MP_PLAN_BUNDLE_YEARLY=...
MP_PLAN_BUNDLE_YEARLY_AUTO=...

# Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=B...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:info@kumo-app.com

# Pricing display (ARS)
NEXT_PUBLIC_PRICE_OCR_MONTHLY=ARS 3.500
NEXT_PUBLIC_PRICE_OCR_YEARLY=ARS 35.000
NEXT_PUBLIC_PRICE_WA_MONTHLY=ARS 3.000
NEXT_PUBLIC_PRICE_WA_YEARLY=ARS 30.000
NEXT_PUBLIC_PRICE_BUNDLE_MONTHLY=ARS 5.990
NEXT_PUBLIC_PRICE_BUNDLE_YEARLY=ARS 59.900
NEXT_PUBLIC_PRICE_YEARLY_PCT=17

# Donaciones
NEXT_PUBLIC_DONATE_URL=https://cafecito.app/miguelguarrochena

# Cron + feeds firmados
CRON_SECRET=<algo-largo-aleatorio>

# WhatsApp automático — límites de costo (opcional, defaults: 200 y 3)
WA_MONTHLY_CAP=200
WA_MAX_RECIPIENTS=3

# WhatsApp: hasta aprobación Meta — oculta suscripción WA/combo, solo OCR en checkout
NEXT_PUBLIC_WHATSAPP_PENDING=true

# Monitoring (opcional)
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
```

> **WhatsApp opcional**: si faltan `WHATSAPP_*`, el cron `/api/notify` sigue mandando **push** y omite WhatsApp automático. Sin plan WA, tampoco se envía por API aunque tengas credenciales.

## 2. Supabase: migraciones

Aplicar todas en orden hasta `0032_billing_terms_acceptances.sql`:

```bash
supabase db push
```

## 3. MercadoPago (OCR, WA, combo)

```bash
export MP_ACCESS_TOKEN="APP_USR-..."
bash scripts/create-mp-plans.sh
```

Copiá los 9 plan IDs a las env vars `MP_PLAN_*`.

- **Mensual**: renovación automática hasta cancelar.
- **Anual sin renovación**: `repetitions: 1` → un solo cobro por 12 meses.
- **Anual con renovación**: sin límite de repetitions → se renueva cada año hasta cancelar.

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

`vercel.json` ejecuta `/api/notify` (9:00 UTC), `/api/cron/subscription-reminders` (10:00 UTC) y `/api/cron/recurring` (3:00 UTC). Requiere `CRON_SECRET` y `RESEND_API_KEY` para los avisos de vencimiento.

## 7. Deploy

```bash
git push origin main
```

## 8. Smoke test

1. `GET /api/billing/health` (logueado) → env críticos en `true`.
2. Gastos → cargar uno manualmente.
3. Configuración → Notificaciones → activar push → mandar prueba.
4. Calendario → crear recordatorio → botón WhatsApp manual (gratis).
5. Configuración → Google Calendar → Conectar con Google (OAuth) → ver evento en Google Calendar en segundos.
6. Gastos → Escanear ticket → paywall OCR → checkout MP (producto OCR).
7. Configuración → Complementos → checkout WA o combo; webhook setea `plan_type`.
8. Con plan WA: cron/notify manda templates; sin plan: solo push.

## 9. Compartir el link

> "Hola, armé Kumo para llevar las cuentas del hogar: https://kumo-app.com
>
> Es gratis (gastos, recordatorios, push, WhatsApp manual). Si querés escanear tickets con IA o que Kumo avise solo por WhatsApp, son complementos opcionales. Cualquier feedback me ayuda."

Si WhatsApp sigue en test, agregá los números de tus familiares en Meta → Recipients.
