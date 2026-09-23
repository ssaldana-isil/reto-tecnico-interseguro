import { defineConfig } from '@playwright/test';

/**
 * Prueba de integración local: levanta los dos servicios reales y el frontend (npm run dev).
 * Requiere Node, Go y las carpetas hermanas ../endorse-service y ../routes-service.
 * Las credenciales son solo para esta prueba local.
 */
const FRONTEND = 'http://localhost:5173';

const endorse = { url: 'http://localhost:3001', clientId: 'frontend', clientSecret: 'e2e-endorse-client-secret' };
// En esta máquina el 8080 lo ocupa otra app (WSL): por defecto la prueba usa 8081; E2E_ROUTES_PORT lo cambia.
const ROUTES_PORT = process.env.E2E_ROUTES_PORT ?? '8081';
const routes = { url: `http://localhost:${ROUTES_PORT}`, clientId: 'frontend', clientSecret: 'e2e-routes-client-secret' };

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: FRONTEND, browserName: 'chromium', headless: true },
  webServer: [
    {
      name: 'endorse-service',
      cwd: '../endorse-service',
      command: 'npm run build && node dist/database/seed.js && node dist/index.js',
      url: `${endorse.url}/v1/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: '3001',
        JWT_SECRET: 'e2e-endorse-jwt-secret',
        CLIENT_ID: endorse.clientId,
        CLIENT_SECRET: endorse.clientSecret,
        CORS_ORIGIN: FRONTEND,
        DB_TYPE: 'sqlite',
        DB_PATH: 'data/e2e.sqlite',
      },
    },
    {
      name: 'routes-service',
      cwd: '../routes-service',
      command: 'go run .',
      url: `${routes.url}/v1/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        PORT: ROUTES_PORT,
        JWT_SECRET: 'e2e-routes-jwt-secret',
        CLIENT_ID: routes.clientId,
        CLIENT_SECRET: routes.clientSecret,
        CORS_ORIGIN: FRONTEND,
      },
    },
    {
      name: 'frontend',
      command: 'npm run dev',
      url: FRONTEND,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        VITE_ENDORSE_API_URL: endorse.url,
        VITE_ROUTES_API_URL: routes.url,
        VITE_ENDORSE_CLIENT_ID: endorse.clientId,
        VITE_ENDORSE_CLIENT_SECRET: endorse.clientSecret,
        VITE_ROUTES_CLIENT_ID: routes.clientId,
        VITE_ROUTES_CLIENT_SECRET: routes.clientSecret,
      },
    },
  ],
});
