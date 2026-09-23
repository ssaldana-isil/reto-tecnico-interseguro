import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProductoModel } from './producto.model';
import { TipoEndosoModel } from './tipo-endoso.model';
import { PlantillaCampoModel } from './plantilla-campo.model';
import { PlantillaEventoModel } from './plantilla-evento.model';
import { PlantillaRiskUnitModel } from './plantilla-risk-unit.model';

@Entity('plantilla')
@Unique('UQ_plantilla_producto_tipo_version', ['producto', 'tipoEndoso', 'version'])
export class PlantillaModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProductoModel, { nullable: false })
  @JoinColumn({ name: 'producto_id', foreignKeyConstraintName: 'FK_plantilla_producto' })
  producto: ProductoModel;

  @ManyToOne(() => TipoEndosoModel, { nullable: false })
  @JoinColumn({ name: 'tipo_endoso_id', foreignKeyConstraintName: 'FK_plantilla_tipo_endoso' })
  tipoEndoso: TipoEndosoModel;

  @Column({ type: 'varchar', name: 'event_description' })
  eventDescription: string;

  @Column('int')
  version: number;

  @Column('boolean')
  activo: boolean;

  @OneToMany(() => PlantillaCampoModel, (campo) => campo.plantilla)
  campos: PlantillaCampoModel[];

  @OneToMany(() => PlantillaEventoModel, (evento) => evento.plantilla)
  eventos: PlantillaEventoModel[];

  @OneToMany(() => PlantillaRiskUnitModel, (riskUnit) => riskUnit.plantilla)
  riskUnits: PlantillaRiskUnitModel[];
}
