import { MigrationInterface, QueryRunner } from 'typeorm';

// Compras a proveedores: suman stock, actualizan el costo y, a crédito, dejan la deuda con el proveedor.
export class CreateForrajeriaCompras2026102800010 implements MigrationInterface {
  name = 'CreateForrajeriaCompras2026102800010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_compras (
        id_compra SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_proveedor INTEGER NOT NULL REFERENCES forrajeria_contactos(id_contacto),
        total NUMERIC(14,2) NOT NULL DEFAULT 0,
        forma_pago VARCHAR(20) NOT NULL DEFAULT 'contado',
        comprobante VARCHAR(60),
        observaciones TEXT,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_compra_items (
        id_item SERIAL PRIMARY KEY,
        id_compra INTEGER NOT NULL REFERENCES forrajeria_compras(id_compra) ON DELETE CASCADE,
        id_producto INTEGER NOT NULL REFERENCES forrajeria_productos(id_producto),
        cantidad NUMERIC(14,3) NOT NULL,
        costo_unitario NUMERIC(14,2) NOT NULL,
        subtotal NUMERIC(14,2) NOT NULL
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_forrajeria_compras_org_fecha ON forrajeria_compras (id_establecimiento, fecha_creacion)',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_forrajeria_compra_items_compra ON forrajeria_compra_items (id_compra)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_compra_items');
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_compras');
  }
}
