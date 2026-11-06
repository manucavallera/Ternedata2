import { MigrationInterface, QueryRunner } from 'typeorm';

// Control lechero individual: litros de cada vaca en el ordeñe de la mañana y
// de la tarde. Un control por vaca y por día.
export class CreateControlesLecheros2026110700010
  implements MigrationInterface
{
  name = 'CreateControlesLecheros2026110700010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS controles_lecheros (
        id_control SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_madre INTEGER NOT NULL REFERENCES madres(id_madre) ON DELETE CASCADE,
        fecha DATE NOT NULL,
        litros_manana NUMERIC(5,1),
        litros_tarde NUMERIC(5,1),
        creado_por INTEGER,
        creado_en TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_control_madre_fecha UNIQUE (id_madre, fecha)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_controles_campo_fecha ON controles_lecheros (id_establecimiento, fecha)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS controles_lecheros`);
  }
}
