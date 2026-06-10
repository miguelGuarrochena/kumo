# Kumo

App de finanzas personales: gastos, vencimientos, recordatorios, lista de compras, espacios compartidos y notificaciones (push y WhatsApp).

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind 4 · Supabase · MercadoPago (OCR) · Meta WhatsApp Cloud

## Desarrollo

```bash
pnpm install
cp .env.example .env.local   # ver SUPABASE_SETUP.md y LAUNCH.md
supabase db push             # migraciones
pnpm dev
```

```bash
pnpm typecheck
pnpm test
pnpm build
```

Documentación operativa: [LAUNCH.md](./LAUNCH.md) · [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
