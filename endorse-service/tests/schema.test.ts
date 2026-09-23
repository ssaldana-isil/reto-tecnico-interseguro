import type { DataSource } from 'typeorm';
import { createDataSource } from '../src/database/data-source';
import { PlantillaModel } from '../src/models';
import { seed } from '../src/database/seed';

let dataSource: DataSource;

beforeEach(async () => {
  dataSource = await createDataSource({ type: 'sqlite', path: ':memory:' }).initialize();
});

afterEach(() => dataSource.destroy());

describe('esquema de BD', () => {
  it('la migración crea exactamente las tablas del diagrama ER', async () => {
    await dataSource.runMigrations();

    const tables = await dataSource.query(
      "select name from sqlite_master where type = 'table' and name not in ('migrations', 'sqlite_sequence') order by name",
    );

    expect(tables.map((t: { name: string }) => t.name)).toStrictEqual([
      'plantilla',
      'plantilla_campo',
      'plantilla_evento',
      'plantilla_risk_unit',
      'producto',
      'tipo_endoso',
    ]);
  });

  it('los modelos TypeORM coinciden con la migración (sin cambios de esquema pendientes)', async () => {
    await dataSource.runMigrations();

    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map((q) => q.query)).toStrictEqual([]);
  });

  it('el seed es re-ejecutable y no duplica plantillas', async () => {
    await seed(dataSource);
    await seed(dataSource);

    expect(await dataSource.getRepository(PlantillaModel).count()).toBe(2);
  });
});
