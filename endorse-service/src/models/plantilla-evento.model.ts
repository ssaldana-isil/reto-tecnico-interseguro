import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { PlantillaModel } from './plantilla.model';

@Entity('plantilla_evento')
@Unique('UQ_plantilla_evento_order', ['plantilla', 'orderEvent'])
export class PlantillaEventoModel {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => PlantillaModel, (plantilla) => plantilla.eventos, { nullable: false })
  @JoinColumn({ name: 'plantilla_id', foreignKeyConstraintName: 'FK_plantilla_evento_plantilla' })
  plantilla: PlantillaModel;

  @Column({ type: 'int', name: 'order_event' })
  orderEvent: number;

  @Column('varchar')
  description: string;
}
