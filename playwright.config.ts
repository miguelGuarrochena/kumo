import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isCI = !!process.env.CI;

// Los flujos autenticados solo se ejecutan si hay credenciales E2E.
// Sin ellas, solo corre el smoke público (igual que antes).
const hasAuth = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;
const AUTH_FILE = path.join(__dirname, 'e2e/.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: !isCI,
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
    // Smoke público (rutas sin auth + redirects). Nunca usa storageState.
    {
      name: 'chromium',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Setup de autenticación: hace login vía Supabase y guarda el storageState.
    ...(hasAuth
      ? [
          {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'] },
          },
          // Flujos autenticados: reutilizan la sesión generada por `setup`.
          {
            name: 'authenticated',
            testMatch: /flow\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
          },
        ]
      : []),
  ],

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
