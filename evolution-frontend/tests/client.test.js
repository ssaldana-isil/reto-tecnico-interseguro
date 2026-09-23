import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServiceClient } from '../src/api/client.js';
import { ApiError } from '../src/api/errors.js';

const json = (status, body) => new Response(body === undefined ? '' : JSON.stringify(body), { status });

/** fetch simulado que responde según la cola de respuestas y registra cada llamada. */
function fakeFetch(...responses) {
  const fn = vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('llamada inesperada a fetch');
    return next;
  });
  return fn;
}

const newClient = (fetchImpl) =>
  createServiceClient({ baseUrl: 'http://svc', clientId: 'web', clientSecret: 's3cret', fetchImpl });

const storage = () => ({ getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() });

beforeEach(() => {
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('sessionStorage', storage());
});

afterEach(() => vi.unstubAllGlobals());

describe('createServiceClient', () => {
  it('pide el token una sola vez y lo reutiliza desde memoria', async () => {
    const fetchImpl = fakeFetch(json(200, { accessToken: 'T1' }), json(200, { ok: 1 }), json(200, { ok: 2 }));
    const client = newClient(fetchImpl);

    await client.post('/v1/x', { a: 1 });
    await client.post('/v1/x', { a: 2 });

    const urls = fetchImpl.mock.calls.map(([url]) => url);
    expect(urls).toEqual(['http://svc/v1/auth/token', 'http://svc/v1/x', 'http://svc/v1/x']);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ clientId: 'web', clientSecret: 's3cret' });
    expect(fetchImpl.mock.calls[2][1].headers.Authorization).toBe('Bearer T1');
  });

  it('nunca guarda el token en localStorage ni sessionStorage', async () => {
    const client = newClient(fakeFetch(json(200, { accessToken: 'T1' }), json(200, {})));

    await client.post('/v1/x', {});

    expect(client.hasToken()).toBe(true);
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('ante un 401 renueva el token y reintenta una vez', async () => {
    const fetchImpl = fakeFetch(
      json(200, { accessToken: 'viejo' }),
      json(401, { error: 'token expirado', code: 'UNAUTHORIZED' }),
      json(200, { accessToken: 'nuevo' }),
      json(200, { ok: true }),
    );

    const out = await newClient(fetchImpl).post('/v1/x', {});

    expect(out).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[3][1].headers.Authorization).toBe('Bearer nuevo');
  });

  it('si el reintento también da 401, no vuelve a intentar y lanza el error', async () => {
    const fetchImpl = fakeFetch(
      json(200, { accessToken: 'T1' }),
      json(401, { error: 'token inválido', code: 'UNAUTHORIZED' }),
      json(200, { accessToken: 'T2' }),
      json(401, { error: 'token inválido', code: 'UNAUTHORIZED' }),
    );

    await expect(newClient(fetchImpl).post('/v1/x', {})).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('convierte el sobre {error, code, details} en ApiError y expone missingFields', async () => {
    const fetchImpl = fakeFetch(
      json(200, { accessToken: 'T1' }),
      json(422, { error: 'faltan campos', code: 'MISSING_FIELDS', details: { missingFields: ['NombreUsuario', 'FechaCliente'] } }),
    );

    const err = await newClient(fetchImpl).post('/v1/x', {}).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'MISSING_FIELDS', message: 'faltan campos' });
    expect(err.items).toEqual(['NombreUsuario', 'FechaCliente']);
  });

  it('expone details.fields de los errores de validación', async () => {
    const fetchImpl = fakeFetch(
      json(200, { accessToken: 'T1' }),
      json(400, { error: 'la solicitud no cumple el esquema', code: 'VALIDATION', details: { fields: ['"producto" is required'] } }),
    );

    const err = await newClient(fetchImpl).post('/v1/x', {}).catch((e) => e);

    expect(err.items).toEqual(['"producto" is required']);
  });

  it('credenciales rechazadas por /auth/token: error UNAUTHORIZED sin reintentar', async () => {
    const fetchImpl = fakeFetch(json(401, { error: 'credenciales inválidas', code: 'UNAUTHORIZED' }));

    await expect(newClient(fetchImpl).post('/v1/x', {})).rejects.toMatchObject({ code: 'UNAUTHORIZED', message: 'credenciales inválidas' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('servicio caído: NETWORK_ERROR', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(newClient(fetchImpl).post('/v1/x', {})).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('sin credenciales configuradas: CONFIG_ERROR sin llamar al servicio', async () => {
    const fetchImpl = vi.fn();
    const client = createServiceClient({ baseUrl: 'http://svc', clientId: undefined, clientSecret: undefined, fetchImpl });

    await expect(client.post('/v1/x', {})).rejects.toMatchObject({ code: 'CONFIG_ERROR' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
