import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTerneroSeguimiento202609090001 implements MigrationInterface {
  name = 'CreateTerneroSeguimiento202609090001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ternero_pesajes (
        id_pesaje SERIAL PRIMARY KEY,
        id_ternero INTEGER NOT NULL REFERENCES terneros(id_ternero) ON DELETE CASCADE,
        id_establecimiento INTEGER NOT NULL,
        fecha DATE NOT NULL,
        peso NUMERIC(8, 2) NOT NULL,
        observaciones TEXT,
        creado_por INTEGER,
        creado_en TIMESTAMP NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_ternero_pesaje_fecha UNIQUE (id_ternero, fecha)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ternero_pesajes_establecimiento
      ON ternero_pesajes (id_establecimiento)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ternero_calostrados (
        id_calostrado SERIAL PRIMARY KEY,
        id_ternero INTEGER NOT NULL REFERENCES terneros(id_ternero) ON DELETE CASCADE,
        id_establecimiento INTEGER NOT NULL,
        fecha_hora TIMESTAMP NOT NULL,
        metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('mamadera', 'sonda')),
        litros NUMERIC(8, 2) NOT NULL,
        grado_brix NUMERIC(5, 2) CHECK (grado_brix IS NULL OR (grado_brix >= 0 AND grado_brix <= 50)),
        observaciones TEXT,
        creado_por INTEGER,
        creado_en TIMESTAMP NOT NULL DEFAULT now(),
        actualizado_en TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ternero_calostrados_establecimiento
      ON ternero_calostrados (id_establecimiento)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ternero_calostrados_ternero_fecha
      ON ternero_calostrados (id_ternero, fecha_hora)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS ternero_calostrados');
    await queryRunner.query('DROP TABLE IF EXISTS ternero_pesajes');
  }
}
