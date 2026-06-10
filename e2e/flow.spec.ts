import { test, expect } from '@playwright/test';
import path from 'node:path';

const AUTH_FILE = path.join(__dirname, '.auth/user.json');
const hasAuth = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.use({ storageState: AUTH_FILE });

test.describe('Authenticated flows', () => {
  test.skip(!hasAuth, 'E2E_USER_EMAIL/PASSWORD no configuradas');

  test('dashboard renderiza con sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside').first()).toBeVisible();
    await expect(page.getByText(/total del mes/i)).toBeVisible();
  });

  test('navegar a Gastos', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /gastos/i }).first().click();
    await page.waitForURL(/\/expenses/);
    await expect(page.locator('h1')).toContainText(/gastos/i);
  });

  test('navegar a Calendario y ver tabs', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.getByRole('button', { name: /mes/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /a[ñn]o/i })).toBeVisible();
  });

  test('shopping carga con tabs de listas', async ({ page }) => {
    await page.goto('/shopping');
    await expect(page.getByRole('button', { name: /supermercado/i })).toBeVisible();
  });

  test('settings muestra todas las secciones', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText(/compartir espacio/i)).toBeVisible();
    await expect(page.getByText(/moneda/i)).toBeVisible();
    await expect(page.getByText(/zona horaria/i)).toBeVisible();
  });

  test('workspace switcher abre y muestra al menos un espacio', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('aside').getByRole('button').first().click();
    await expect(page.getByRole('listbox')).toBeVisible();
  });
});
