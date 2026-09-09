import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTerneroSeguimiento2026090921000 implements MigrationInterface {
  name = 'CreateTerneroSeguimiento2026090921000';

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

    const terneros = await queryRunner.query(`
      SELECT id_ternero, id_establecimiento, fecha_nacimiento,
        peso_15d, peso_30d, peso_45d, estimativo,
        metodo_calostrado, litros_calostrado, fecha_hora_calostrado,
        observaciones_calostrado, grado_brix, creado_en
      FROM terneros
      WHERE id_establecimiento IS NOT NULL
    `);

    const fechaConDias = (fecha: string | Date, dias: number) => {
      const resultado = new Date(fecha);
      resultado.setUTCDate(resultado.getUTCDate() + dias);
      return resultado.toISOString().slice(0, 10);
    };

    const fechaLegacy = (valor: string, nacimiento: string | Date) => {
      const completo = valor.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (completo) return valor;
      const corto = valor.match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!corto) return null;
      const añoNacimiento = new Date(nacimiento).getUTCFullYear();
      return `${añoNacimiento}-${corto[2].padStart(2, '0')}-${corto[1].padStart(2, '0')}`;
    };

    for (const ternero of terneros) {
      const hitos = [
        [15, ternero.peso_15d],
        [30, ternero.peso_30d],
        [45, ternero.peso_45d],
      ];

      for (const [dias, peso] of hitos) {
        if (!peso || Number(peso) <= 0 || !ternero.fecha_nacimiento) continue;
        await queryRunner.query(
          `INSERT INTO ternero_pesajes
            (id_ternero, id_establecimiento, fecha, peso, observaciones)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id_ternero, fecha) DO NOTHING`,
          [
            ternero.id_ternero,
            ternero.id_establecimiento,
            fechaConDias(ternero.fecha_nacimiento, dias),
            Number(peso),
            `Migrado desde peso_${dias}d`,
          ],
        );
      }

      if (ternero.estimativo) {
        for (const entrada of String(ternero.estimativo).split('|')) {
          const separador = entrada.lastIndexOf(':');
          if (separador < 1) continue;
          const fecha = fechaLegacy(entrada.slice(0, separador), ternero.fecha_nacimiento);
          const peso = Number(entrada.slice(separador + 1));
          if (!fecha || !Number.isFinite(peso) || peso <= 0) continue;
          await queryRunner.query(
            `INSERT INTO ternero_pesajes
              (id_ternero, id_establecimiento, fecha, peso, observaciones)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id_ternero, fecha) DO NOTHING`,
            [ternero.id_ternero, ternero.id_establecimiento, fecha, peso, 'Migrado desde estimativo'],
          );
        }
      }

      if (ternero.metodo_calostrado && ternero.litros_calostrado) {
        const fechaHora = ternero.fecha_hora_calostrado || ternero.creado_en || ternero.fecha_nacimiento;
        await queryRunner.query(
          `INSERT INTO ternero_calostrados
            (id_ternero, id_establecimiento, fecha_hora, metodo, litros, grado_brix, observaciones)
           SELECT $1, $2, $3, CAST($4 AS VARCHAR(20)), $5, $6, $7
           WHERE NOT EXISTS (
             SELECT 1 FROM ternero_calostrados
             WHERE id_ternero = $1 AND fecha_hora = $3 AND metodo = CAST($4 AS VARCHAR(20))
           )`,
          [
            ternero.id_ternero,
            ternero.id_establecimiento,
            fechaHora,
            ternero.metodo_calostrado,
            Number(ternero.litros_calostrado),
            ternero.grado_brix == null ? null : Number(ternero.grado_brix),
            ternero.observaciones_calostrado,
          ],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS ternero_calostrados');
    await queryRunner.query('DROP TABLE IF EXISTS ternero_pesajes');
  }
}
