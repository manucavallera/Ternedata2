import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateForrajeriaContactosCuentas2026083100030 implements MigrationInterface {
  name = 'CreateForrajeriaContactosCuentas2026083100030';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_contactos (
        id_contacto SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        tipo VARCHAR(20) NOT NULL,
        nombre VARCHAR(150) NOT NULL,
        documento VARCHAR(30),
        telefono VARCHAR(50),
        whatsapp VARCHAR(50),
        email VARCHAR(150),
        direccion VARCHAR(200),
        zona VARCHAR(100),
        limite_credito NUMERIC(14,2) NOT NULL DEFAULT 0,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_movimientos_cuenta (
        id_movimiento SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_contacto INTEGER NOT NULL REFERENCES forrajeria_contactos(id_contacto),
        concepto VARCHAR(200) NOT NULL,
        debe NUMERIC(14,2) NOT NULL DEFAULT 0,
        haber NUMERIC(14,2) NOT NULL DEFAULT 0,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_forrajeria_contactos_org_tipo_nombre ON forrajeria_contactos (id_establecimiento, tipo, nombre)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_forrajeria_cuentas_org_contacto ON forrajeria_movimientos_cuenta (id_establecimiento, id_contacto, fecha_creacion)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_movimientos_cuenta');
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_contactos');
  }
}
