import 'reflect-metadata';
import type { DataSource, EntityManager } from 'typeorm';
import { loadDbConfig } from '../config';
import {
  PlantillaCampoModel,
  PlantillaEventoModel,
  PlantillaModel,
  PlantillaRiskUnitModel,
  ProductoModel,
  TipoEndosoModel,
} from '../models';
import { createDataSource } from './data-source';
import { seedPlantillas, type PlantillaSeed } from './seed-data';

async function upsertByCodigo<T extends ProductoModel | TipoEndosoModel>(
  manager: EntityManager,
  model: new () => T,
  data: { codigo: string; nombre: string },
): Promise<T> {
  const repo = manager.getRepository(model);
  const existing = await repo.findOne({ where: { codigo: data.codigo } as never });
  return repo.save(Object.assign(existing ?? repo.create(), data) as T);
}

/** Reemplaza la plantilla (producto, tipo, versión) si ya existía, para que el seed sea re-ejecutable. */
async function loadPlantilla(manager: EntityManager, seed: PlantillaSeed): Promise<void> {
  const producto = await upsertByCodigo(manager, ProductoModel, seed.producto);
  const tipoEndoso = await upsertByCodigo(manager, TipoEndosoModel, seed.tipoEndoso);

  const previous = await manager.findOne(PlantillaModel, {
    where: { producto: { id: producto.id }, tipoEndoso: { id: tipoEndoso.id }, version: seed.version },
  });
  if (previous) {
    const byPlantilla = { plantilla: { id: previous.id } };
    await manager.delete(PlantillaCampoModel, byPlantilla);
    await manager.delete(PlantillaEventoModel, byPlantilla);
    await manager.delete(PlantillaRiskUnitModel, byPlantilla);
    await manager.delete(PlantillaModel, { id: previous.id });
  }

  const plantilla = await manager.save(
    manager.create(PlantillaModel, {
      producto,
      tipoEndoso,
      eventDescription: seed.eventDescription,
      version: seed.version,
      activo: seed.activo,
    }),
  );
  await manager.save(
    seed.campos.map((campo, index) =>
      manager.create(PlantillaCampoModel, {
        plantilla,
        orden: index + 1,
        etiqueta: campo.etiqueta,
        origen: campo.origen,
        campoEntrada: campo.campoEntrada ?? null,
        valorDefault: campo.valorDefault ?? null,
        requerido: campo.requerido,
      }),
    ),
  );
  await manager.save(seed.eventos.map((evento) => manager.create(PlantillaEventoModel, { plantilla, ...evento })));
  await manager.save(seed.riskUnits.map((riskUnit) => manager.create(PlantillaRiskUnitModel, { plantilla, ...riskUnit })));
}

/** Ejecuta las migraciones pendientes y carga las plantillas de ejemplo en una transacción. */
export async function seed(dataSource: DataSource): Promise<void> {
  await dataSource.runMigrations();
  await dataSource.transaction(async (manager) => {
    for (const plantilla of seedPlantillas) {
      await loadPlantilla(manager, plantilla);
    }
  });
}

if (require.main === module) {
  const dataSource = createDataSource(loadDbConfig());
  dataSource
    .initialize()
    .then(() => seed(dataSource))
    .then(() => {
      console.log(`seed OK: ${seedPlantillas.map((p) => `${p.producto.codigo}/${p.tipoEndoso.codigo}`).join(', ')}`);
      return dataSource.destroy();
    })
    .catch((err) => {
      console.error('seed falló:', err);
      process.exit(1);
    });
}
