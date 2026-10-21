import { MigrationInterface, QueryRunner } from 'typeorm';

// Mensajes del bot ya procesados (update_id de Telegram o messageId de WhatsApp).
// Antes vivían en memoria: un reinicio o un redeploy los perdía y un reintento de
// Evolution podía registrar dos veces el mismo animal.
export class CreateBotMensajesProcesados2026102100010 implements MigrationInterface {
  name = 'CreateBotMensajesProcesados2026102100010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS bot_mensajes_procesados (
        clave VARCHAR(200) PRIMARY KEY,
        creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_bot_mensajes_procesados_creado_en ON bot_mensajes_procesados (creado_en)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS bot_mensajes_procesados`);
  }
}
