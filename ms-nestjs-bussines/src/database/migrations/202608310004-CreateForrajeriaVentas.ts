import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateForrajeriaVentas2026083100040 implements MigrationInterface {
  name = 'CreateForrajeriaVentas2026083100040';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_pedidos (
        id_pedido SERIAL PRIMARY KEY,
        id_establecimiento INTEGER NOT NULL REFERENCES establecimientos(id_establecimiento),
        id_cliente INTEGER NOT NULL REFERENCES forrajeria_contactos(id_contacto),
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
        total NUMERIC(14,2) NOT NULL DEFAULT 0,
        forma_entrega VARCHAR(20) NOT NULL DEFAULT 'retiro',
        direccion_entrega VARCHAR(200),
        zona_entrega VARCHAR(100),
        observaciones TEXT,
        fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
        fecha_actualizacion TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS forrajeria_pedido_items (
        id_item SERIAL PRIMARY KEY,
        id_pedido INTEGER NOT NULL REFERENCES forrajeria_pedidos(id_pedido),
        id_producto INTEGER NOT NULL REFERENCES forrajeria_productos(id_producto),
        cantidad NUMERIC(14,3) NOT NULL,
        precio_unitario NUMERIC(14,2) NOT NULL,
        subtotal NUMERIC(14,2) NOT NULL
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_forrajeria_pedidos_org_estado ON forrajeria_pedidos (id_establecimiento, estado, fecha_creacion)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_pedido_items');
    await queryRunner.query('DROP TABLE IF EXISTS forrajeria_pedidos');
  }
}

