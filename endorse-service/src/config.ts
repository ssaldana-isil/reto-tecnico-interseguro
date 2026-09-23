export type DbConfig = { type: 'sqlite'; path: string } | { type: 'postgres'; url: string };

export interface AppConfig {
  port: number;
  jwtSecret: string;
  clientId: string;
  clientSecret: string;
  tokenTtlSeconds: number;
  corsOrigin: string[];
  db: DbConfig;
}

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

/** Configuración de base de datos: la usan también migrate y seed, que no necesitan secretos. */
export function loadDbConfig(env: Env = process.env): DbConfig {
  const type = env.DB_TYPE ?? 'sqlite';
  if (type === 'sqlite') {
    return { type, path: env.DB_PATH ?? 'data/endorse.sqlite' };
  }
  if (type === 'postgres') {
    if (!env.DB_URL) {
      throw new ConfigError('DB_TYPE=postgres requiere DB_URL');
    }
    return { type, url: env.DB_URL };
  }
  throw new ConfigError(`DB_TYPE no soportado: ${type} (usa sqlite o postgres)`);
}

/** Configuración completa del servidor. Falla si falta algún secreto: no hay valores por defecto. */
export function loadConfig(env: Env = process.env): AppConfig {
  const required = ['JWT_SECRET', 'CLIENT_ID', 'CLIENT_SECRET'] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new ConfigError(`faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  }
  return {
    port: Number(env.PORT ?? 8080),
    jwtSecret: env.JWT_SECRET!,
    clientId: env.CLIENT_ID!,
    clientSecret: env.CLIENT_SECRET!,
    tokenTtlSeconds: 3600,
    corsOrigin: (env.CORS_ORIGIN ?? '*').split(',').map((origin) => origin.trim()).filter(Boolean),
    db: loadDbConfig(env),
  };
}
