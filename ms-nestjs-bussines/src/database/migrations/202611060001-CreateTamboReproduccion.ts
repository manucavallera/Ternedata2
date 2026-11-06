import { MigrationInterface, QueryRunner } from 'typeorm';

// Rodeo lechero: eventos reproductivos por vaca y el estado que dejan en madres.
// Las columnas nuevas de madres se recalculan desde los eventos; se guardan para
// poder filtrar y armar los pendientes sin recorrer el historial en cada pedido.
export class CreateTamboReproduccion2026110600010
  implements MigrationInterface
{
  name = 'CreateTamboReproduccion2026110600010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS eventos_reproductivos (
        id_evento SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_madre INTEGER NOT NULL REFERENCES madres(id_madre) ON DELETE CASCADE,
        tipo VARCHAR(20) NOT NULL,
        fecha DATE NOT NULL,
        resultado VARCHAR(20),
        dias_gestacion INTEGER,
        toro VARCHAR(100),
        observacion TEXT,
        creado_por INTEGER,
        creado_en TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_eventos_repro_madre ON eventos_reproductivos (id_madre, fecha)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_eventos_repro_campo ON eventos_reproductivos (id_establecimiento, fecha)`,
    );
    await queryRunner.query(`
      ALTER TABLE madres
        ADD COLUMN IF NOT EXISTS estado_reproductivo VARCHAR(20),
        ADD COLUMN IF NOT EXISTS fecha_ultimo_parto DATE,
        ADD COLUMN IF NOT EXISTS fecha_ultimo_servicio DATE,
        ADD COLUMN IF NOT EXISTS fecha_ultimo_parche DATE,
        ADD COLUMN IF NOT EXISTS fecha_parto_probable DATE,
        ADD COLUMN IF NOT EXISTS numero_servicios INTEGER NOT NULL DEFAULT 0
    `);
    // El último ternero cargado es el último parto conocido. El estado
    // reproductivo queda vacío ("sin dato") hasta que se cargue un evento.
    await queryRunner.query(`
      UPDATE madres m
      SET fecha_ultimo_parto = t.ultimo
      FROM (
        SELECT id_madre, MAX(fecha_nacimiento)::date AS ultimo
        FROM terneros
        WHERE id_madre IS NOT NULL AND fecha_nacimiento IS NOT NULL
        GROUP BY id_madre
      ) t
      WHERE t.id_madre = m.id_madre AND m.fecha_ultimo_parto IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS eventos_reproductivos`);
    await queryRunner.query(`
      ALTER TABLE madres
        DROP COLUMN IF EXISTS estado_reproductivo,
        DROP COLUMN IF EXISTS fecha_ultimo_parto,
        DROP COLUMN IF EXISTS fecha_ultimo_servicio,
        DROP COLUMN IF EXISTS fecha_ultimo_parche,
        DROP COLUMN IF EXISTS fecha_parto_probable,
        DROP COLUMN IF EXISTS numero_servicios
    `);
  }
}
