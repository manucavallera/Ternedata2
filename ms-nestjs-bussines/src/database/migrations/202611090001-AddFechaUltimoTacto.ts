import { MigrationInterface, QueryRunner } from 'typeorm';

// Tambo: fecha del último tacto, para saber qué preñadas faltan reconfirmar (mes 6).
export class AddFechaUltimoTacto2026110900010 implements MigrationInterface {
  name = 'AddFechaUltimoTacto2026110900010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE madres ADD COLUMN IF NOT EXISTS fecha_ultimo_tacto DATE`,
    );
    // Último tacto después del último parto de cada vaca.
    await queryRunner.query(`
      UPDATE madres m
      SET fecha_ultimo_tacto = t.ultimo
      FROM (
        SELECT e.id_madre, MAX(e.fecha) AS ultimo
        FROM eventos_reproductivos e
        JOIN madres mm ON mm.id_madre = e.id_madre
        WHERE e.tipo = 'tacto'
          AND (mm.fecha_ultimo_parto IS NULL OR e.fecha >= mm.fecha_ultimo_parto)
        GROUP BY e.id_madre
      ) t
      WHERE t.id_madre = m.id_madre
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE madres DROP COLUMN IF EXISTS fecha_ultimo_tacto`,
    );
  }
}
