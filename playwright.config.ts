import { defineConfig, devices } from '@playwright/test';

// Playwright config para Kumo.
//
// Modos:
//   pnpm e2e            → run headless (CI)
//   pnpm e2e:ui         → run con UI inspector (local debugging)
//   pnpm e2e:install    → instala browsers (correr una vez)
//
// Variables de entorno opcionales:
//   PLAYWRIGHT_BASE_URL    → default http://localhost:3000
//   E2E_USER_EMAIL         → email del test user (para auth fixture)
//   E2E_USER_PASSWORD      → password del test user (solo si usás email/password)
//
// Nota: Los tests asumen que tenés `pnpm dev` corriendo en otra terminal,
// o configurá webServer abajo para auto-start.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isCI,            // en CI corremos serial para evitar conflictos de DB
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html']] : 'list',
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Descomentar para correr también en mobile:
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Auto-arranca el dev server si no está corriendo
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
