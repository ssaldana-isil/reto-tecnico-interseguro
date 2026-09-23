import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataSource } from 'typeorm';
import type { DbConfig } from '../config';
import { models } from '../models';
import { InitialSchema1727100000000 } from './migrations/1727100000000-InitialSchema';

const common = {
  entities: models,
  migrations: [InitialSchema1727100000000],
  synchronize: false,
  logging: false,
};

/** Crea la conexión según DB_TYPE. SQLite para correr sin infraestructura; Postgres para producción. */
export function createDataSource(db: DbConfig): DataSource {
  if (db.type === 'postgres') {
    return new DataSource({ type: 'postgres', url: db.url, ...common });
  }
  if (db.path !== ':memory:') {
    mkdirSync(dirname(db.path), { recursive: true });
  }
  return new DataSource({ type: 'better-sqlite3', database: db.path, ...common });
}
