import { createServiceClient } from './client.js';

const env = import.meta.env;

/** Un cliente (y por lo tanto un token en memoria) por servicio, cada uno con sus credenciales. */
export const endorseApi = createServiceClient({
  baseUrl: env.VITE_ENDORSE_API_URL || 'http://localhost:3001',
  clientId: env.VITE_ENDORSE_CLIENT_ID,
  clientSecret: env.VITE_ENDORSE_CLIENT_SECRET,
});

export const routesApi = createServiceClient({
  baseUrl: env.VITE_ROUTES_API_URL || 'http://localhost:8080',
  clientId: env.VITE_ROUTES_CLIENT_ID,
  clientSecret: env.VITE_ROUTES_CLIENT_SECRET,
});
