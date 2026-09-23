import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('producto')
@Unique('UQ_producto_codigo', ['codigo'])
export class ProductoModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  codigo: string;

  @Column('varchar')
  nombre: string;
}
