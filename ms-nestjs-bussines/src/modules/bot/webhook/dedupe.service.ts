import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ─────────────────────────────────────────────
// Dedupe de mensajes entrantes. Telegram/Evolution reenvían el mismo update si
// el webhook no responde 200 a tiempo: sin esto, doble proceso (doble registro
// de animales). Las claves se guardan en la tabla bot_mensajes_procesados, así
// sobreviven a reinicios y redeploys. Si la base falla, se usa la memoria.
// ─────────────────────────────────────────────

const TTL_MEMORIA_MS = 5 * 60 * 1000; // ventana de reintentos
const RETENCION_DB = '2 days';
const LIMPIEZA_CADA_MS = 60 * 60 * 1000;

@Injectable()
export class DedupeService {
  private readonly logger = new Logger(DedupeService.name);
  private vistos = new Map<string, number>();
  private ultimaLimpieza = 0;

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Extrae una clave estable del payload crudo (update_id de Telegram o
   * messageId de WhatsApp/Evolution). null si no se puede determinar.
   */
  extraerClave(body: any): string | null {
    if (body?.update_id != null) return 'tg:' + body.update_id;
    const id =
      body?.data?.key?.id || body?.body?.data?.key?.id || body?.key?.id;
    if (id) return 'wsp:' + String(id).slice(0, 190);
    return null;
  }

  /**
   * Devuelve true si la clave ya fue vista (duplicado). Si es nueva, la
   * registra y devuelve false.
   */
  async esDuplicado(clave: string | null): Promise<boolean> {
    if (!clave) return false;
    const ahora = Date.now();
    // La memoria corta los reintentos inmediatos sin ir a la base.
    if (this.duplicadoEnMemoria(clave, ahora)) return true;

    try {
      const filas = await this.dataSource.query(
        `INSERT INTO bot_mensajes_procesados (clave) VALUES ($1)
         ON CONFLICT (clave) DO NOTHING RETURNING clave`,
        [clave],
      );
      this.limpiarDb(ahora);
      return filas.length === 0;
    } catch (err) {
      this.logger.warn(`Dedupe en base no disponible: ${err?.message || err}`);
      return false; // ya quedó registrado en memoria
    }
  }

  private duplicadoEnMemoria(clave: string, ahora: number): boolean {
    for (const [k, t] of this.vistos) {
      if (ahora - t > TTL_MEMORIA_MS) this.vistos.delete(k);
    }
    if (this.vistos.has(clave)) return true;
    this.vistos.set(clave, ahora);
    return false;
  }

  private limpiarDb(ahora: number): void {
    if (ahora - this.ultimaLimpieza < LIMPIEZA_CADA_MS) return;
    this.ultimaLimpieza = ahora;
    this.dataSource
      .query(
        `DELETE FROM bot_mensajes_procesados WHERE creado_en < now() - interval '${RETENCION_DB}'`,
      )
      .catch((err) =>
        this.logger.warn(`No se pudo limpiar el dedupe: ${err?.message || err}`),
      );
  }
}
