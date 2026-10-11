import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTipoOrganizacion2026083100010 implements MigrationInterface {
  name = 'AddTipoOrganizacion2026083100010';

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('establecimientos');

    if (!table || table.findColumnByName('tipo_organizacion')) return;

    await queryRunner.addColumn(
      'establecimientos',
      new TableColumn({
        name: 'tipo_organizacion',
        type: 'varchar',
        length: '20',
        isNullable: false,
        default: "'ganaderia'",
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('establecimientos');

    if (table?.findColumnByName('tipo_organizacion')) {
      await queryRunner.dropColumn('establecimientos', 'tipo_organizacion');
    }
  }
}
