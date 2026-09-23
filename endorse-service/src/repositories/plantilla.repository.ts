import type { DataSource, Repository } from 'typeorm';
import { PlantillaModel } from '../models';

export interface PlantillaRepository {
  /** Plantilla activa de mayor versión para el par, con campos, eventos y risk units. */
  findActive(productoCodigo: string, tipoEndosoCodigo: string): Promise<PlantillaModel | null>;
}

export class TypeOrmPlantillaRepository implements PlantillaRepository {
  private readonly repo: Repository<PlantillaModel>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(PlantillaModel);
  }

  findActive(productoCodigo: string, tipoEndosoCodigo: string): Promise<PlantillaModel | null> {
    return this.repo.findOne({
      where: { activo: true, producto: { codigo: productoCodigo }, tipoEndoso: { codigo: tipoEndosoCodigo } },
      relations: { campos: true, eventos: true, riskUnits: true },
      order: { version: 'DESC' },
    });
  }
}
