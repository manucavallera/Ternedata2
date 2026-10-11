import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateForrajeriaCatalogoInventario2026083100020 implements MigrationInterface {
  name = 'CreateForrajeriaCatalogoInventario2026083100020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_categorias (
        id_categoria SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        nombre VARCHAR(100) NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_productos (
        id_producto SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_categoria INTEGER NULL REFERENCES forrajeria_categorias(id_categoria),
        nombre VARCHAR(150) NOT NULL,
        sku VARCHAR(50),
        unidad_venta VARCHAR(20) NOT NULL,
        costo NUMERIC(14,2) NOT NULL DEFAULT 0,
        precio NUMERIC(14,2) NOT NULL DEFAULT 0,
        stock_actual NUMERIC(14,3) NOT NULL DEFAULT 0,
        stock_minimo NUMERIC(14,3) NOT NULL DEFAULT 0,
        lote VARCHAR(80),
        vencimiento DATE,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo',
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_movimientos_stock (
        id_movimiento SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_producto INTEGER NOT NULL REFERENCES forrajeria_productos(id_producto),
        tipo VARCHAR(20) NOT NULL,
        cantidad NUMERIC(14,3) NOT NULL,
        stock_anterior NUMERIC(14,3) NOT NULL,
        stock_nuevo NUMERIC(14,3) NOT NULL,
        motivo VARCHAR(200),
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_forrajeria_productos_org_nombre ON forrajeria_productos (id_establecimiento, nombre)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_forrajeria_movimientos_org_producto ON forrajeria_movimientos_stock (id_establecimiento, id_producto, fecha_creacion)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_movimientos_stock');
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_productos');
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_categorias');
  }
}
