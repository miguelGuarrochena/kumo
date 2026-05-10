# Kumo · Tus gastos como una nube perfecta

App de finanzas personales: gastos, vencimientos, recordatorios (citas médicas, cumpleaños), lista de compras y notificaciones por WhatsApp.

> **Estado**: foundation lista. Auth + Categorías 100% funcionales. Resto de módulos en skeleton (placeholders con TODO claro).

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19.2** + **TypeScript 5.6**
- **Tailwind CSS 4** (CSS-first config, sin tailwind.config.js)
- **Zustand 5** para estado de cliente
- **Supabase** (Postgres + Auth + RLS) — tier gratis alcanza para portfolio + miles de usuarios
- **WhatsApp Cloud API** (Meta directa, sin Twilio) — 1.000 conversaciones/mes gratis
- **Recharts** para gráficos
- **lucide-react** para iconos

## Setup rápido

```bash
# 1. Instalar deps
pnpm install

# 2. Copiar variables de entorno
cp .env.example .env.local
# Editá .env.local con tus credenciales (ver SUPABASE_SETUP.md)

# 3. Correr migration en tu proyecto Supabase
# Pegá supabase/migrations/0001_init.sql en SQL Editor de Supabase y ejecutá

# 4. Levantar
pnpm dev
# → http://localhost:3000
```

Para el setup completo de Supabase (OAuth de Google, RLS, etc.) y de Twilio Sandbox, ver [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).

## Estructura

```
kumo/
├── app/
│   ├── (app)/                  # Rutas autenticadas (con sidebar)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── expenses/           # TODO
│   │   ├── categories/         # ✅ Completo
│   │   ├── reminders/          # TODO
│   │   ├── shopping/           # TODO
│   │   ├── calendar/           # TODO
│   │   └── settings/           # ✅ Completo
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── api/notify/route.ts     # Endpoint cron para mandar WhatsApp
│   ├── globals.css             # Tailwind + design system
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CloudLogo.tsx           # Logo Kumo
│   ├── CloudDecorations.tsx    # Nubes flotantes de fondo
│   ├── EmptyState.tsx
│   └── Sidebar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── middleware.ts
│   │   └── database.types.ts
│   └── notifications/
│       ├── types.ts            # Interface NotificationAdapter
│       └── whatsapp.ts         # Implementación Twilio
├── supabase/
│   └── migrations/0001_init.sql
├── middleware.ts               # Protección de rutas
└── ...configs
```

## Diseño / Branding

- **Marca**: Kumo (雲, "nube" en japonés). Misma onda que la extensión Kumo Apply (en standby).
- **Paleta**: pastel — sky (cielo), lavender (violeta suave), peach (durazno), mint (menta), rose. Definida en `app/globals.css` con `@theme`.
- **Aesthetic**: nubecitas flotantes en el fondo (`CloudDecorations`), gradient indigo-violeta para el logo y CTAs principales, cards con borde sutil y soft shadow.
- **Animaciones**: `cloud-float` y `cloud-drift` (CSS keyframes).

## Roadmap

Hecho:
- [x] Foundation: Next 16 + React 19 + Tailwind 4 + Zustand
- [x] Auth con Google via Supabase
- [x] Schema Postgres con RLS, trigger de signup que crea categorías default
- [x] Layout con sidebar + decoraciones de nubes
- [x] Dashboard con stats
- [x] CRUD de Categorías (módulo completo de referencia)
- [x] Settings con WhatsApp + moneda + zona horaria
- [x] Adapter de notificaciones + endpoint cron para WhatsApp

Falta (en orden):
- [ ] CRUD de Gastos: form, lista, totales mensuales, filtros
- [ ] Gráficos (torta por categoría, evolución mensual)
- [ ] CRUD de Recordatorios (citas, cumpleaños) con tipos
- [ ] CRUD de Lista de compras (multi-listas)
- [ ] Calendario mensual con eventos
- [ ] Setup de cron real (Vercel Cron o Supabase pg_cron)
- [ ] Modo oscuro
- [ ] PWA install
- [ ] Sync con Google Calendar (export only)

## Notas técnicas

**Tailwind 4 CSS-first**: no hay `tailwind.config.js`. Los tokens de color, fuentes y utilidades custom viven en `app/globals.css` dentro del bloque `@theme` y como `@utility`.

**Server Actions**: las operaciones de DB (categorías, settings) usan Server Actions con Zod para validación. RLS de Supabase asegura que cada user toca solo lo suyo.

**Notificaciones**: el endpoint `/api/notify` está pensado para correr cada 1-6 horas via cron. Por ahora hay que llamarlo manualmente con `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/notify` para probar. Hooks de cron real: ver SUPABASE_SETUP.md.

**Privacidad**: los datos quedan en tu proyecto Supabase. Service role key NUNCA se expone al cliente (solo en `/api/notify`).

## Desarrollo

```bash
pnpm dev        # localhost:3000
pnpm build      # production build
pnpm typecheck  # validar tipos sin compilar
pnpm db:types   # regenerar tipos desde Supabase (después de migration)
```
