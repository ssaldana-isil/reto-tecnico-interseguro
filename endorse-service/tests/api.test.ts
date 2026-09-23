import type { Server } from '@hapi/hapi';
import jwt from 'jsonwebtoken';
import type { DataSource } from 'typeorm';
import type { AppConfig } from '../src/config';
import { createDataSource } from '../src/database/data-source';
import { seed } from '../src/database/seed';
import { createServer } from '../src/server';
import { pdfInput, pdfOutput } from './fixtures';

const config: AppConfig = {
  port: 0,
  jwtSecret: 'test-secret',
  clientId: 'web',
  clientSecret: 's3cret',
  tokenTtlSeconds: 60,
  corsOrigin: ['*'],
  db: { type: 'sqlite', path: ':memory:' },
};

let dataSource: DataSource;
let server: Server;
let bearer: string;

beforeAll(async () => {
  dataSource = await createDataSource(config.db).initialize();
  await seed(dataSource);
  server = await createServer(config, dataSource);
  const res = await server.inject({ method: 'POST', url: '/v1/auth/token', payload: { clientId: 'web', clientSecret: 's3cret' } });
  bearer = `Bearer ${(res.result as { accessToken: string }).accessToken}`;
});

afterAll(async () => {
  await server.stop();
  await dataSource.destroy();
});

const translate = (payload: object, authorization?: string) =>
  server.inject({
    method: 'POST',
    url: '/v1/endorse/translate',
    payload,
    headers: authorization ? { authorization } : {},
  });

describe('POST /v1/auth/token', () => {
  it('emite un JWT HS256 con el contrato de routes-service', async () => {
    const res = await server.inject({ method: 'POST', url: '/v1/auth/token', payload: { clientId: 'web', clientSecret: 's3cret' } });

    expect(res.statusCode).toBe(200);
    expect(res.result).toMatchObject({ tokenType: 'Bearer', expiresIn: 60 });
  });

  it('rechaza credenciales inválidas con 401 UNAUTHORIZED', async () => {
    const res = await server.inject({ method: 'POST', url: '/v1/auth/token', payload: { clientId: 'web', clientSecret: 'mala' } });

    expect(res.statusCode).toBe(401);
    expect(res.result).toStrictEqual({ error: 'credenciales inválidas', code: 'UNAUTHORIZED' });
  });
});

describe('POST /v1/endorse/translate', () => {
  it('con JWT: 200 y exactamente la salida del PDF, leyendo la plantilla de la BD', async () => {
    const res = await translate(pdfInput, bearer);

    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe(JSON.stringify(pdfOutput));
  });

  it('sin JWT: 401 UNAUTHORIZED', async () => {
    const res = await translate(pdfInput);

    expect(res.statusCode).toBe(401);
    expect(res.result).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('con JWT firmado con otro secreto: 401', async () => {
    const forged = jwt.sign({}, 'otro-secreto', { algorithm: 'HS256', subject: 'web', issuer: 'endorse-service' });

    const res = await translate(pdfInput, `Bearer ${forged}`);

    expect(res.statusCode).toBe(401);
    expect(res.result).toStrictEqual({ error: 'token inválido', code: 'UNAUTHORIZED' });
  });

  it('plantilla inexistente: 404 TEMPLATE_NOT_FOUND con el par consultado', async () => {
    const res = await translate({ ...pdfInput, tipoEndoso: 'CambioDireccion' }, bearer);

    expect(res.statusCode).toBe(404);
    expect(res.result).toMatchObject({
      code: 'TEMPLATE_NOT_FOUND',
      details: { producto: 'Rumbo', tipoEndoso: 'CambioDireccion' },
    });
  });

  it('campos requeridos faltantes: 422 MISSING_FIELDS con la lista completa', async () => {
    const { usuario, fechaSolicitud, ...incompleto } = pdfInput;

    const res = await translate(incompleto, bearer);

    expect(res.statusCode).toBe(422);
    expect(res.result).toMatchObject({
      code: 'MISSING_FIELDS',
      details: { missingFields: ['NombreUsuario', 'FechaSolicitud'] },
    });
  });

  it('sin policyNumber/producto/tipoEndoso: 400 VALIDATION (Joi) listando todos', async () => {
    const res = await translate({ idEnvio: 1 }, bearer);

    expect(res.statusCode).toBe(400);
    expect(res.result).toMatchObject({ code: 'VALIDATION' });
    expect((res.result as { details: { fields: string[] } }).details.fields).toHaveLength(3);
  });

  it('extensibilidad: la segunda plantilla (solo datos) traduce sin código nuevo', async () => {
    const res = await translate(
      { policyNumber: 'VF-1', producto: 'VidaFlex', tipoEndoso: 'CambioBeneficiario', usuario: 'u', beneficiario: 'Ana', fechaSolicitud: '2025-08-27', plan: 'PlanFlex' },
      bearer,
    );

    expect(res.statusCode).toBe(200);
    expect((res.result as typeof pdfOutput).eventEntity.dynamicData).toStrictEqual([
      { etiqueta: 'NumeroPolizaEndoso', value: 'VF-1' },
      { etiqueta: 'NombreUsuario', value: 'u' },
      { etiqueta: 'NombreBeneficiario', value: 'Ana' },
      { etiqueta: 'ParentescoBeneficiario', value: 'Otro' },
      { etiqueta: 'FechaSolicitud', value: '2025-08-27' },
    ]);
  });
});

describe('GET /v1/health', () => {
  it('responde 200 {status: ok}', async () => {
    const res = await server.inject({ method: 'GET', url: '/v1/health' });

    expect(res.statusCode).toBe(200);
    expect(res.result).toStrictEqual({ status: 'ok' });
  });
});
