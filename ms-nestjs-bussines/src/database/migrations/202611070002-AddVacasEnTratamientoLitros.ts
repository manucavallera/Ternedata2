import { MigrationInterface, QueryRunner } from 'typeorm';

// Producción diaria del tambo: vacas que se ordeñan pero cuya leche se tira
// (en tratamiento). Las vacas en ordeñe siguen en cantidad_vacas.
export class AddVacasEnTratamientoLitros2026110700020
  implements MigrationInterface
{
  name = 'AddVacasEnTratamientoLitros2026110700020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE registro_litros ADD COLUMN IF NOT EXISTS vacas_en_tratamiento INTEGER`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE registro_litros DROP COLUMN IF EXISTS vacas_en_tratamiento`,
    );
  }
}
