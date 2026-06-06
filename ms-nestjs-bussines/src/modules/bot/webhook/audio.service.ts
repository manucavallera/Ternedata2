import { Injectable, Logger } from '@nestjs/common';

// ─────────────────────────────────────────────
// Descarga de audio (Telegram / WhatsApp-Evolution) + transcripción
// con Groq Whisper. Portado de los nodos "Descargar Audio TG/WSP",
// "Code in JavaScript" y "Groq Whisper (Transcribir)" del workflow n8n.
// ─────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'whisper-large-v3';
const GROQ_PROMPT =
  'ternero, ternera, madre, vaca, rp, caravana, establecimiento, campo, peso, ' +
  'nacimiento, semen, tratamiento, vacuna, diarrea, destete, tacto, inseminación, ' +
  'antibiótico, desparasitante, macho, hembra, vivo, muerto, leve, moderada, severa, ' +
  'pajuela, toro, rodeo';

const EVOLUTION_URL =
  process.env.EVOLUTION_API_URL || 'https://manu-evolution-api.gygo4l.easypanel.host';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'manu';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  /**
   * Descarga un audio de Telegram a partir del fileId.
   * 1) getFile → file_path  2) descarga el binario.
   */
  async descargarAudioTelegram(fileId: string): Promise<Buffer> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN no configurada');

    const infoRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const info: any = await infoRes.json();
    if (!info?.ok || !info?.result?.file_path) {
      throw new Error('Telegram getFile falló: ' + JSON.stringify(info).substring(0, 200));
    }

    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${info.result.file_path}`,
    );
    if (!fileRes.ok) throw new Error(`Descarga audio TG ${fileRes.status}`);
    return Buffer.from(await fileRes.arrayBuffer());
  }

  /**
   * Descarga un audio de WhatsApp vía Evolution API (base64 → Buffer).
   */
  async descargarAudioWhatsapp(messageId: string): Promise<Buffer> {
    const apikey = process.env.EVOLUTION_API_KEY;
    if (!apikey) throw new Error('EVOLUTION_API_KEY no configurada');

    const res = await fetch(
      `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: { apikey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: { key: { id: messageId } },
          convertToMp4: true,
        }),
      },
    );
    if (!res.ok) throw new Error(`Evolution getBase64 ${res.status}`);
    const data: any = await res.json();
    let base64: string = data.base64 || data.data || '';
    if (base64.includes(',')) base64 = base64.split(',')[1];
    if (!base64) throw new Error('Evolution sin base64 de audio');
    return Buffer.from(base64, 'base64');
  }

  /**
   * Transcribe un buffer de audio con Groq Whisper. Devuelve el texto.
   */
  async transcribir(audio: Buffer): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

    const form = new FormData();
    const blob = new Blob([audio], { type: 'audio/ogg' });
    form.append('file', blob, 'audio_nota.ogg');
    form.append('model', GROQ_MODEL);
    form.append('language', 'es');
    form.append('response_format', 'json');
    form.append('prompt', GROQ_PROMPT);

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq Whisper ${res.status}: ${err.substring(0, 200)}`);
    }
    const data: any = await res.json();
    return data?.text || '';
  }

  /**
   * Descarga (según origen) + transcribe. Devuelve el texto reconocido.
   */
  async transcribirMensaje(msg: {
    _origen: 'telegram' | 'whatsapp';
    fileId: string | null;
    _messageId?: string;
  }): Promise<string> {
    let audio: Buffer;
    if (msg._origen === 'telegram') {
      if (!msg.fileId) throw new Error('Audio Telegram sin fileId');
      audio = await this.descargarAudioTelegram(msg.fileId);
    } else {
      if (!msg._messageId) throw new Error('Audio WhatsApp sin messageId');
      audio = await this.descargarAudioWhatsapp(msg._messageId);
    }
    return this.transcribir(audio);
  }
}
