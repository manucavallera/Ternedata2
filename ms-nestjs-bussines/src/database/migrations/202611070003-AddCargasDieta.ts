import { MigrationInterface, QueryRunner } from 'typeorm';

// Mixers: en cuántas cargas se divide la ración de una dieta en modo mezcla.
export class AddCargasDieta2026110700030 implements MigrationInterface {
  name = 'AddCargasDieta2026110700030';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE rodeo_dietas ADD COLUMN IF NOT EXISTS cargas INTEGER NOT NULL DEFAULT 1`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE rodeo_dietas DROP COLUMN IF EXISTS cargas`,
    );
  }
}
