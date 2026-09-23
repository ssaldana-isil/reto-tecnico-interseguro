import 'reflect-metadata';
import { ConfigError, loadConfig } from './config';
import { createDataSource } from './database/data-source';
import { createServer } from './server';

async function main(): Promise<void> {
  const config = loadConfig();
  const dataSource = await createDataSource(config.db).initialize();
  const server = await createServer(config, dataSource);
  await server.start();
  console.log(`endorse-service escuchando en ${server.info.uri}`);
}

main().catch((err) => {
  console.error(err instanceof ConfigError ? `configuración inválida: ${err.message}` : err);
  process.exit(1);
});
