import 'reflect-metadata';
import { loadDbConfig } from '../config';
import { createDataSource } from './data-source';

const dataSource = createDataSource(loadDbConfig());
dataSource
  .initialize()
  .then(() => dataSource.runMigrations())
  .then((applied) => {
    console.log(`migraciones aplicadas: ${applied.length ? applied.map((m) => m.name).join(', ') : 'ninguna pendiente'}`);
    return dataSource.destroy();
  })
  .catch((err) => {
    console.error('migración falló:', err);
    process.exit(1);
  });
