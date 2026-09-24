import { defineConfig } from '@playwright/test';

/**
 * E2E contra producción: frontend en Vercel y servicios en Render, sin levantar procesos locales.
 * Render (plan Free) suspende los servicios tras inactividad y el primer request puede tardar ~30-60 s:
 * por eso los timeouts de 90 s. Conviene calentar antes cada /v1/health (ver README raíz).
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 90_000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://reto-tecnico-interseguro.vercel.app',
    browserName: 'chromium',
    headless: true,
    navigationTimeout: 90_000,
    actionTimeout: 90_000,
  },
});
