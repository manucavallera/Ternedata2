import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForrajeriaB2BOrderFields2026090200010 implements MigrationInterface {
  name = 'AddForrajeriaB2BOrderFields2026090200010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE forrajeria_contactos ADD COLUMN IF NOT EXISTS es_productor BOOLEAN NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE forrajeria_pedidos ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(20) NOT NULL DEFAULT 'contado'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE forrajeria_pedidos DROP COLUMN IF EXISTS forma_pago`);
    await queryRunner.query(`ALTER TABLE forrajeria_contactos DROP COLUMN IF EXISTS es_productor`);
  }
}
