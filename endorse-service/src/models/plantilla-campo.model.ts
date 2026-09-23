import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { PlantillaModel } from './plantilla.model';

export enum OrigenCampo {
  INPUT = 'INPUT',
  DEFAULT = 'DEFAULT',
}

@Entity('plantilla_campo')
@Unique('UQ_plantilla_campo_orden', ['plantilla', 'orden'])
@Unique('UQ_plantilla_campo_etiqueta', ['plantilla', 'etiqueta'])
export class PlantillaCampoModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PlantillaModel, (plantilla) => plantilla.campos, { nullable: false })
  @JoinColumn({ name: 'plantilla_id', foreignKeyConstraintName: 'FK_plantilla_campo_plantilla' })
  plantilla: PlantillaModel;

  /** Posición exacta del item dentro de dynamicData. */
  @Column('int')
  orden: number;

  @Column('varchar')
  etiqueta: string;

  @Column({ type: 'simple-enum', enum: OrigenCampo })
  origen: OrigenCampo;

  /** Clave del JSON plano de la que se toma el valor (origen INPUT). */
  @Column({ type: 'varchar', name: 'campo_entrada', nullable: true })
  campoEntrada: string | null;

  @Column({ type: 'varchar', name: 'valor_default', nullable: true })
  valorDefault: string | null;

  @Column('boolean')
  requerido: boolean;
}
