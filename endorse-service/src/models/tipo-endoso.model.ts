import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('tipo_endoso')
@Unique('UQ_tipo_endoso_codigo', ['codigo'])
export class TipoEndosoModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  codigo: string;

  @Column('varchar')
  nombre: string;
}
