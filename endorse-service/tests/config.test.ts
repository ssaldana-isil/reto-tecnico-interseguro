import { ConfigError, loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('no arranca si faltan secretos y lista todos los que faltan', () => {
    expect(() => loadConfig({ CLIENT_ID: 'web' })).toThrow(new ConfigError('faltan variables de entorno obligatorias: JWT_SECRET, CLIENT_SECRET'));
  });

  it('aplica defaults solo a lo no sensible', () => {
    const config = loadConfig({ JWT_SECRET: 'j', CLIENT_ID: 'c', CLIENT_SECRET: 's' });

    expect(config).toMatchObject({ port: 8080, corsOrigin: ['*'], db: { type: 'sqlite', path: 'data/endorse.sqlite' } });
  });

  it('lee CORS_ORIGIN como lista separada por comas', () => {
    const config = loadConfig({ JWT_SECRET: 'j', CLIENT_ID: 'c', CLIENT_SECRET: 's', CORS_ORIGIN: 'http://a.pe, http://b.pe' });

    expect(config.corsOrigin).toStrictEqual(['http://a.pe', 'http://b.pe']);
  });
});
