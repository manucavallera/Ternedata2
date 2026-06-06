import { Injectable, Logger } from '@nestjs/common';

// ─────────────────────────────────────────────
// Envío de respuestas al usuario (Telegram / WhatsApp-Evolution).
// Portado de los nodos "Enviar Telegram" / "Enviar WhatsApp" del
// workflow n8n.
// ─────────────────────────────────────────────

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || 'https://manu-evolution-api.gygo4l.easypanel.host';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'manu';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  async enviarTelegram(chatId: string, mensaje: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurada');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`sendMessage Telegram ${res.status}: ${err.substring(0, 200)}`);
    }
  }

  async enviarWhatsapp(phone: string, mensaje: string): Promise<void> {
    const apikey = process.env.EVOLUTION_API_KEY;
    if (!apikey) throw new Error('EVOLUTION_API_KEY no configurada');

    const res = await fetch(
      `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: { apikey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, text: mensaje }),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`sendText WhatsApp ${res.status}: ${err.substring(0, 200)}`);
    }
  }

  /**
   * Responde según el origen del mensaje. chatId para Telegram, phone para WhatsApp.
   */
  async responder(
    origen: 'telegram' | 'whatsapp',
    destino: string,
    mensaje: string,
  ): Promise<void> {
    if (origen === 'telegram') {
      await this.enviarTelegram(destino, mensaje);
    } else {
      await this.enviarWhatsapp(destino, mensaje);
    }
  }
}
