import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';

const id = { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' as const };
const plantillaFk = (table: string) =>
  new TableForeignKey({
    name: `FK_${table}_plantilla`,
    columnNames: ['plantilla_id'],
    referencedTableName: 'plantilla',
    referencedColumnNames: ['id'],
  });

/**
 * Esquema de plantillas dinámicas (ver docs/er-plantillas.png).
 * Usa la API de Table de TypeORM para que la misma migración sirva en SQLite y Postgres.
 */
export class InitialSchema1727100000000 implements MigrationInterface {
  name = 'InitialSchema1727100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'producto',
        columns: [id, { name: 'codigo', type: 'varchar' }, { name: 'nombre', type: 'varchar' }],
        uniques: [new TableUnique({ name: 'UQ_producto_codigo', columnNames: ['codigo'] })],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'tipo_endoso',
        columns: [id, { name: 'codigo', type: 'varchar' }, { name: 'nombre', type: 'varchar' }],
        uniques: [new TableUnique({ name: 'UQ_tipo_endoso_codigo', columnNames: ['codigo'] })],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plantilla',
        columns: [
          id,
          { name: 'producto_id', type: 'integer' },
          { name: 'tipo_endoso_id', type: 'integer' },
          { name: 'event_description', type: 'varchar' },
          { name: 'version', type: 'integer' },
          { name: 'activo', type: 'boolean' },
        ],
        uniques: [
          new TableUnique({
            name: 'UQ_plantilla_producto_tipo_version',
            columnNames: ['producto_id', 'tipo_endoso_id', 'version'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_plantilla_producto',
            columnNames: ['producto_id'],
            referencedTableName: 'producto',
            referencedColumnNames: ['id'],
          }),
          new TableForeignKey({
            name: 'FK_plantilla_tipo_endoso',
            columnNames: ['tipo_endoso_id'],
            referencedTableName: 'tipo_endoso',
            referencedColumnNames: ['id'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plantilla_campo',
        columns: [
          id,
          { name: 'plantilla_id', type: 'integer' },
          { name: 'orden', type: 'integer' },
          { name: 'etiqueta', type: 'varchar' },
          { name: 'origen', type: 'simple-enum', enum: ['INPUT', 'DEFAULT'] },
          { name: 'campo_entrada', type: 'varchar', isNullable: true },
          { name: 'valor_default', type: 'varchar', isNullable: true },
          { name: 'requerido', type: 'boolean' },
        ],
        uniques: [
          new TableUnique({ name: 'UQ_plantilla_campo_orden', columnNames: ['plantilla_id', 'orden'] }),
          new TableUnique({ name: 'UQ_plantilla_campo_etiqueta', columnNames: ['plantilla_id', 'etiqueta'] }),
        ],
        foreignKeys: [plantillaFk('plantilla_campo')],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plantilla_evento',
        columns: [
          id,
          { name: 'plantilla_id', type: 'integer' },
          { name: 'order_event', type: 'integer' },
          { name: 'description', type: 'varchar' },
        ],
        uniques: [new TableUnique({ name: 'UQ_plantilla_evento_order', columnNames: ['plantilla_id', 'order_event'] })],
        foreignKeys: [plantillaFk('plantilla_evento')],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'plantilla_risk_unit',
        columns: [
          id,
          { name: 'plantilla_id', type: 'integer' },
          { name: 'risk_unit_number', type: 'varchar' },
          { name: 'insurance_object_number', type: 'varchar' },
          { name: 'campo_plan_entrada', type: 'varchar' },
        ],
        foreignKeys: [plantillaFk('plantilla_risk_unit')],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['plantilla_risk_unit', 'plantilla_evento', 'plantilla_campo', 'plantilla', 'tipo_endoso', 'producto']) {
      await queryRunner.dropTable(table);
    }
  }
}
