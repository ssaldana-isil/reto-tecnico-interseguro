import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlantillaModel } from './plantilla.model';

@Entity('plantilla_risk_unit')
export class PlantillaRiskUnitModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PlantillaModel, (plantilla) => plantilla.riskUnits, { nullable: false })
  @JoinColumn({ name: 'plantilla_id', foreignKeyConstraintName: 'FK_plantilla_risk_unit_plantilla' })
  plantilla: PlantillaModel;

  @Column({ type: 'varchar', name: 'risk_unit_number' })
  riskUnitNumber: string;

  @Column({ type: 'varchar', name: 'insurance_object_number' })
  insuranceObjectNumber: string;

  /** Clave del JSON plano cuyo valor va a plansEntity.description. */
  @Column({ type: 'varchar', name: 'campo_plan_entrada' })
  campoPlanEntrada: string;
}
