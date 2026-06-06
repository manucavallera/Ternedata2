import { Injectable } from '@nestjs/common';

// ─────────────────────────────────────────────
// Dedupe de mensajes entrantes. Telegram/Evolution reintegran el mismo
// update si el webhook no responde 200 a tiempo → sin esto, doble proceso
// (doble registro de animales). Guarda los IDs vistos en memoria con TTL.
// Asume instancia única del servicio bussines.
// ─────────────────────────────────────────────

const TTL_MS = 5 * 60 * 1000; // 5 min: ventana de reintentos

@Injectable()
export class DedupeService {
  private vistos = new Map<string, number>();

  /**
   * Extrae una clave estable del payload crudo (update_id de Telegram o
   * messageId de WhatsApp/Evolution). null si no se puede determinar.
   */
  extraerClave(body: any): string | null {
    if (body?.update_id != null) return 'tg:' + body.update_id;
    const id =
      body?.data?.key?.id || body?.body?.data?.key?.id || body?.key?.id;
    if (id) return 'wsp:' + id;
    return null;
  }

  /**
   * Devuelve true si la clave ya fue vista (duplicado). Si es nueva, la
   * registra y devuelve false. Limpia entradas vencidas de paso.
   */
  esDuplicado(clave: string | null): boolean {
    if (!clave) return false;
    const ahora = Date.now();
    this.limpiar(ahora);
    if (this.vistos.has(clave)) return true;
    this.vistos.set(clave, ahora);
    return false;
  }

  private limpiar(ahora: number): void {
    for (const [k, t] of this.vistos) {
      if (ahora - t > TTL_MS) this.vistos.delete(k);
    }
  }
}
