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

  const supabase = createClient(url!, anon!);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  if (error || !data.session) {
    throw new Error(`E2E login failed: ${error?.message ?? 'no session'}`);
  }

  await page.goto('/');
  await page.evaluate(
    ({ access, refresh, projectRef }) => {
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

  await page.context().storageState({ path: AUTH_FILE });
});
