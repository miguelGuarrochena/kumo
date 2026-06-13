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

  test('command palette abre con ⌘K y muestra NLP', async ({ page }) => {
    await page.goto('/expenses');
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+KeyK`);
    const input = page.getByPlaceholder(/buscar gastos|search expenses/i);
    await expect(input).toBeVisible();
    await input.fill('gasté 5000 en el super');
    await expect(page.getByText(/agregar gasto con ia|add expense with ai/i)).toBeVisible();
  });

  test('buscar en mobile abre command palette', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/expenses');
    await page.getByRole('button', { name: /^buscar$|^search$/i }).click();
    await expect(page.getByPlaceholder(/buscar gastos|search expenses/i)).toBeVisible();
  });

  test('tab Gastos ↔ Saldos cambia sin recargar', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/gastos|expenses/i);
    await page.getByRole('button', { name: /^saldos$|^balances$/i }).click();
    await expect(page.locator('body')).toContainText(/saldo|balance|deuda|owe/i);
    await page.getByRole('button', { name: /^gastos$|^expenses$/i }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/gastos|expenses/i);
  });

  test('tip del buscador visible la primera vez en gastos', async ({ page }) => {
    await page.goto('/expenses');
    await page.evaluate(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('kumo_tip_dismissed_'))
        .forEach((k) => localStorage.removeItem(k));
    });
    await page.reload();
    await expect(page.getByText(/buscador|search also adds/i)).toBeVisible();
  });
});
