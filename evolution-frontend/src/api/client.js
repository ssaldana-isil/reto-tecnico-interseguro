import { ApiError, toApiError } from './errors.js';

async function readJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Cliente de un servicio con autenticación client-credentials.
 * El accessToken vive solo en esta closure (memoria): nunca en localStorage ni sessionStorage.
 * Ante un 401 renueva el token y reintenta la llamada una única vez.
 */
export function createServiceClient({ baseUrl, clientId, clientSecret, fetchImpl = (...args) => fetch(...args) }) {
  let token = null;

  async function request(url, init) {
    try {
      return await fetchImpl(url, init);
    } catch {
      throw new ApiError({ code: 'NETWORK_ERROR', message: `no se pudo conectar con ${baseUrl}` });
    }
  }

  async function renewToken() {
    if (!clientId || !clientSecret) {
      throw new ApiError({ code: 'CONFIG_ERROR', message: 'faltan las credenciales del cliente en las variables de entorno' });
    }
    token = null;
    const res = await request(`${baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    const body = await readJson(res);
    if (!res.ok) throw toApiError(res.status, body);
    token = body.accessToken;
  }

  async function send(path, payload) {
    return request(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  }

  return {
    /** POST autenticado; devuelve el JSON de respuesta o lanza ApiError. */
    async post(path, payload) {
      if (!token) await renewToken();
      let res = await send(path, payload);
      if (res.status === 401) {
        await renewToken();
        res = await send(path, payload);
      }
      const body = await readJson(res);
      if (!res.ok) throw toApiError(res.status, body);
      return body;
    },
    /** Solo para diagnóstico y tests: indica si hay token en memoria. */
    hasToken: () => token !== null,
  };
}
