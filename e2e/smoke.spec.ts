import { test, expect } from '@playwright/test';

test.describe('Public routes', () => {
  test('landing page carga y muestra CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Kumo/);
    await expect(page.getByRole('link', { name: /empezar|get started/i }).first()).toBeVisible();
  });

  test('landing explica gratis vs Pro', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/gratis/i);
    await expect(page.locator('body')).toContainText(/lenguaje natural/i);
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
    await expect(page.locator('body')).toContainText(/inv[áa]lido|login|invitaci[óo]n/i);
  });
});

test.describe('Protected routes (sin auth, deben redirigir)', () => {
  for (const path of ['/dashboard', '/expenses', '/calendar', '/shopping', '/split', '/metrics', '/categories', '/settings']) {
    test(`${path} redirige a /auth/login`, async ({ page }) => {
      await page.goto(path);
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
