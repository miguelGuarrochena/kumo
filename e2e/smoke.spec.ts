import { test, expect } from '@playwright/test';

// Smoke tests — verifican que las rutas PÚBLICAS cargan sin errores
// y muestran contenido básico. No requieren autenticación ni DB de test.
//
// Para tests de flujos autenticados (crear gasto, recordatorios, etc) ver
// flow.spec.ts (necesita un test Supabase con E2E_USER_EMAIL).

test.describe('Public routes', () => {
  test('landing page carga y muestra CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Kumo/);
    // El botón "Empezar gratis" o equivalente debería estar visible
    await expect(page.getByRole('link', { name: /empezar|get started/i }).first()).toBeVisible();
  });

  test('login page carga con botón Google', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /email/i })).toBeVisible();
  });

  test('email magic link mode muestra form', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByRole('button', { name: /continuar con email/i }).click();
    await expect(page.getByLabel(/tu email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link/i })).toBeVisible();
  });

  test('privacy policy carga', async ({ page }) => {
    await page.goto('/legal/privacy');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('terms carga', async ({ page }) => {
    await page.goto('/legal/terms');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('accept-invite sin token muestra error amigable', async ({ page }) => {
    await page.goto('/accept-invite');
    // El page debería mostrar "Link inválido" o redirigir a login
    await expect(page.locator('body')).toContainText(/inv[áa]lido|login|invitaci[óo]n/i);
  });
});

test.describe('Protected routes (sin auth, deben redirigir)', () => {
  for (const path of ['/dashboard', '/expenses', '/calendar', '/shopping', '/dividir', '/metrics', '/categories', '/settings']) {
    test(`${path} redirige a /auth/login`, async ({ page }) => {
      await page.goto(path);
      // El middleware redirige a login
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/auth/login');
    });
  }
});

test.describe('Acceso no autorizado', () => {
  test('/api/export/expenses sin auth devuelve 401', async ({ request }) => {
    const r = await request.get('/api/export/expenses');
    expect(r.status()).toBe(401);
  });
});
