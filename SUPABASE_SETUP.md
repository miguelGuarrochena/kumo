# Setup completo · Kumo

Guía paso a paso para dejar la app funcionando local. Tiempo: 20-30 minutos.

## 1. Crear proyecto Supabase

1. Andá a [supabase.com](https://supabase.com), creá cuenta gratis.
2. **New project** → nombre "kumo", contraseña fuerte (guardala), región más cercana (São Paulo si estás en LATAM).
3. Esperá 2-3 minutos a que se cree.

## 2. Correr la migration

1. En tu proyecto, sidebar izquierda → **SQL Editor**.
2. **New query** → pegá todo el contenido de `supabase/migrations/0001_init.sql`.
3. **Run** (o `Cmd+Enter`).
4. Deberías ver "Success. No rows returned" — ya está la base de datos.

## 3. Configurar OAuth de Google

### En Google Cloud Console

1. Andá a [console.cloud.google.com](https://console.cloud.google.com).
2. **New Project** → nombre "Kumo".
3. **APIs & Services** → **OAuth consent screen** → External → completá nombre, email, etc.
4. **Credentials** → **Create credentials** → **OAuth Client ID** → Web Application.
5. **Authorized redirect URIs**: agregá la URL que te muestra Supabase (ver paso siguiente).
6. Guardá **Client ID** y **Client Secret**.

### En Supabase

1. Sidebar → **Authentication** → **Providers** → **Google**.
2. Pegá Client ID y Client Secret.
3. Copiá la **Callback URL** que Supabase te muestra y pegala en Google Cloud (paso 5 de arriba).
4. **Save**.

### En tu app (.env.local)

1. Sidebar Supabase → **Project Settings** → **API**.
2. Copiá:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (¡nunca exponer al cliente!)
   - **Project ID** → `SUPABASE_PROJECT_ID` (lo ves en la URL del proyecto)

## 3b. Google Calendar (sync en tiempo real, aparte del login)

El login con Google (Supabase) **no** incluye permisos de calendario. Para sync Kumo → Google Calendar:

1. En el mismo proyecto de Google Cloud → **APIs & Services** → **Library** → habilitá **Google Calendar API**.
2. **Credentials** → **Create credentials** → **OAuth Client ID** → Web Application (podés usar otro client distinto al de Supabase).
3. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/google-calendar/callback` (dev)
   - `https://tu-dominio.com/api/auth/google-calendar/callback` (prod)
4. En **OAuth consent screen** → **Scopes** → agregá `.../auth/calendar.events`.
5. En Vercel / `.env.local`:
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
6. Corré la migración `0033_google_calendar_oauth.sql` (`supabase db push`).

El usuario conecta desde **Configuración → Google Calendar → Conectar con Google**. Los cambios en recordatorios y vencimientos se reflejan en Google en segundos.

## 4. Configurar WhatsApp via Meta Cloud API (oficial, directa)

> Por qué este camino: pega directo a la API oficial de Meta sin Twilio en el medio.
> Tier gratis: 1.000 conversaciones/mes. Después pagás directo a Meta sin markup de proveedores.

### Crear app en Meta for Developers

1. Andá a [developers.facebook.com/apps](https://developers.facebook.com/apps).
2. **Create App** → tipo **Business**.
3. Nombre "Kumo", email de contacto. **Create**.
4. En el dashboard de la app, agregá el producto **WhatsApp** → **Set up**.
5. Te lleva al "API Setup" de WhatsApp. Acá tenés:
   - Un **Test phone number** (número Meta que podés usar gratis para dev).
   - Un **Phone number ID** → copialo a `WHATSAPP_PHONE_NUMBER_ID`.
   - Un **Temporary access token** (24hs) → copialo a `WHATSAPP_ACCESS_TOKEN`.
   - Un **Business Account ID** → opcional, copialo a `WHATSAPP_BUSINESS_ACCOUNT_ID`.

### Agregar tu número como destinatario de prueba

Para dev, Meta solo te deja mandar mensajes a números que registraste como "destinatarios de prueba":

1. En "API Setup" → **To** → **Manage phone number list**.
2. Agregá tu propio WhatsApp (formato internacional, ej. +54911XXXXXXXX).
3. Recibís un código de verificación por WhatsApp → cargalo en Meta.

### Probar el setup

Desde "API Setup", click **Send message**. Debería llegarte un mensaje de prueba ("hello_world template") a tu WhatsApp. Si llega, el setup está OK.

### Para producción

El token temporal de 24hs no sirve para producción. Necesitás:

1. **System User token permanente**: Meta Business Settings → System Users → New System User → asignar permiso `whatsapp_business_messaging` a la app de Kumo → Generate New Token (sin expiración).
2. **Verificar tu propio número** (no el de test de Meta) y agregarlo como sender.
3. **Aprobar message templates** para mensajes "iniciados por el negocio" (notificaciones automáticas). Las que mandamos en Kumo (vencimientos, recordatorios) son de este tipo. Toma 1-3 días por template.

## 5. CRON_SECRET

Generá uno con:

```bash
openssl rand -hex 32
```

Y pegalo en `.env.local` como `CRON_SECRET=...`.

## 6. Levantar la app

```bash
pnpm install
pnpm dev
```

Andá a `http://localhost:3000` → debería redirigir a `/auth/login`. Click "Continuar con Google" → autorizar → debería llevarte al dashboard.

## 7. Probar notificaciones manualmente

En **Settings** del dashboard, cargá tu número de WhatsApp (formato `+54911XXXXXXXX`).

Después, desde la terminal:

```bash
curl -X POST http://localhost:3000/api/notify \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Si tenés algún recordatorio o gasto con vencimiento próximo cargado, te debería llegar un mensaje al WhatsApp.

## 8. Cron real (cuando lances)

Tres opciones, de simple a robusta:

### Opción A: Vercel Cron (si deployás en Vercel)

Creá `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/notify", "schedule": "0 8,18 * * *" }
  ]
}
```

Vercel le manda POST a `/api/notify` a las 8 y 18 hs. Hay que ajustar el handler para aceptar GET también o usar header de autenticación.

### Opción B: Supabase pg_cron + http

Activás la extensión `pg_cron` en Supabase y creás un job que dispare `http_post` cada N horas.

### Opción C: cron-job.org (free)

Configurás un cron externo gratis que pegue al endpoint cada hora.

## 9. Producción

Para deployar:

1. **Vercel** (más fácil): conectá el repo de GitHub, agregá las env vars en el dashboard, deploy automático.
2. **Cloudflare Pages**: similar pero con Cloudflare Workers para edge functions.
3. **Railway** o **Fly.io**: si querés algo más cercano a "tu propio server".

Después de deployar, actualizá:
- En Supabase Auth → **Site URL**: tu dominio de producción.
- En Google Cloud → **Authorized redirect URIs**: agregá la callback URL de producción.
- En `.env.local` (vars de Vercel): `NEXT_PUBLIC_APP_URL` con tu dominio real.

## Troubleshooting

**"redirect_uri_mismatch" al loguearse con Google**
La callback URL de Supabase no está en la lista de Google Cloud. Verificá que ambas URLs coincidan exactamente.

**No me llegan WhatsApps**
- Verificá que el número destinatario esté en la lista de "destinatarios de prueba" en Meta (durante dev).
- Verificá que el access token no haya expirado (los temporales duran 24hs).
- Para mensajes "iniciados por el negocio" en producción, necesitás template aprobado por Meta — sin template, solo podés responder dentro de las 24hs siguientes a que el user te escriba.
- Probá el endpoint manualmente con curl: `curl -X POST "https://graph.facebook.com/v21.0/$PHONE_ID/messages" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"messaging_product":"whatsapp","to":"54911XXXXXXXX","type":"template","template":{"name":"hello_world","language":{"code":"en_US"}}}'`

**RLS bloquea queries**
Verificá que estés haciendo queries autenticadas (con cookie/token). Si usás service role key (server side), saltea RLS.

**Categorías default no aparecen al signup**
El trigger `on_auth_user_created` debería crear las defaults. Verificá en Supabase → Database → Triggers que esté activo.
