// Auth setup para tests de flujos autenticados.
//
// Estrategia: usar Supabase Admin API para crear/verificar un user de
// prueba (sin pasar por Google OAuth), guardar el storageState en disco,
// y reutilizarlo en todos los tests autenticados con `test.use({ storageState })`.
//
// REQUIERE estas env vars:
//   E2E_SUPABASE_URL                 → URL del Supabase de test (idealmente NO el de producción)
//   E2E_SUPABASE_ANON_KEY            → anon key del Supabase de test
//   E2E_USER_EMAIL                   → email del test user (ej: e2e@kumo-app.test)
//   E2E_USER_PASSWORD                → password del test user (≥6 chars)
//
// Para crear el user la primera vez:
//   1. En Supabase dashboard del proyecto de test, Authentication → Users → Add user
//   2. Usá los valores de E2E_USER_EMAIL + E2E_USER_PASSWORD
//   3. El trigger handle_new_user le crea workspace + categorías automáticamente
//
// Después: pnpm e2e (los tests se autentican con storage state).

import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.E2E_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!url || !anon || !email || !password) {
    setup.skip(true, 'E2E env vars not set — skipping authenticated flow tests');
  }

  // Login via Supabase JS SDK (mucho más rápido que pasar por la UI)
  const supabase = createClient(url!, anon!);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  if (error || !data.session) {
    throw new Error(`E2E login failed: ${error?.message ?? 'no session'}`);
  }

  // Inyectamos las cookies de Supabase en el contexto del browser
  await page.goto('/');
  await page.evaluate(
    ({ access, refresh, projectRef }) => {
      // Supabase JS SDK guarda en localStorage con prefijo sb-{projectRef}-auth-token
      const key = `sb-${projectRef}-auth-token`;
      const payload = {
        access_token: access,
        refresh_token: refresh,
        expires_in: 3600,
        token_type: 'bearer',
      };
      localStorage.setItem(key, JSON.stringify(payload));
    },
    {
      access: data.session.access_token,
      refresh: data.session.refresh_token,
      projectRef: new URL(url!).hostname.split('.')[0],
    },
  );

  // Guardamos el storage state
  await page.context().storageState({ path: AUTH_FILE });
});
