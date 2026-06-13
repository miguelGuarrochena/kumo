import { test, expect } from '@playwright/test';

// El storageState y la condición de ejecución los maneja el proyecto
// `authenticated` en playwright.config.ts (depende del proyecto `setup`).
test.describe('Authenticated flows', () => {
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
