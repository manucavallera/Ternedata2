// ─────────────────────────────────────────────
// Adaptadores de payload crudo → formato normalizado.
// Portado de los nodos "Adaptador Telegram" / "Adaptador WhatsApp"
// del workflow n8n (TerneData Bot v18). Funciones puras = testeables.
// ─────────────────────────────────────────────

export interface MensajeNormalizado {
  _origen: 'telegram' | 'whatsapp';
  phone: string;
  name: string;
  type: 'text' | 'audio' | 'unknown';
  text: string | null;
  fileId: string | null;
  audioUrl: string | null;
  remoteJid: string | null;
  timestamp: string;
  // solo whatsapp
  _rawMessage?: any;
  _rawKey?: any;
  _messageId?: string;
}

/**
 * Normaliza un update crudo de Telegram. Devuelve null si no hay mensaje útil.
 */
export function adaptarTelegram(update: any): MensajeNormalizado | null {
  const msg = update?.message;
  if (!msg || !msg.chat) return null;

  const senderId = msg.chat.id.toString();
  const senderName = msg.from?.first_name || 'Ganadero';

  let type: MensajeNormalizado['type'] = 'unknown';
  let text: string | null = null;
  let fileId: string | null = null;

  if (msg.text) {
    type = 'text';
    text = msg.text;
  } else if (msg.voice || msg.audio) {
    type = 'audio';
    fileId = msg.voice?.file_id || msg.audio?.file_id || null;
  }

  return {
    _origen: 'telegram',
    phone: senderId,
    name: senderName,
    type,
    text,
    fileId,
    audioUrl: null,
    remoteJid: null,
    timestamp: new Date((msg.date || Date.now() / 1000) * 1000).toISOString(),
  };
}

/**
 * Normaliza un webhook crudo de WhatsApp (Evolution API).
 * Devuelve null si hay que descartar (grupo, status, eco del bot, pending, tipo no soportado).
 */
export function adaptarWhatsapp(payload: any): MensajeNormalizado | null {
  const body = payload?.body || payload || {};
  const data = body.data || body;
  const key = data.key || {};
  const msg = data.message || {};
  const remoteJid: string = key.remoteJid || '';
  const senderId = remoteJid.replace('@s.whatsapp.net', '');

  // Descartar grupos y estados
  if (remoteJid.includes('status@broadcast') || remoteJid.includes('@g.us')) {
    return null;
  }
  // Descartar mensajes del propio bot (eco)
  if (key.fromMe === true) return null;
  // Descartar mensajes en estado PENDING (no entregados)
  if (data.status === 'PENDING') return null;

  const senderName = data.pushName || 'Ganadero';
  const messageType = data.messageType || '';

  let type: MensajeNormalizado['type'] = 'unknown';
  let text: string | null = null;
  let audioUrl: string | null = null;

  if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
    type = 'text';
    text =
      msg.conversation ||
      (msg.extendedTextMessage && msg.extendedTextMessage.text) ||
      '';
  } else if (messageType === 'audioMessage') {
    type = 'audio';
    audioUrl = msg.audioMessage ? msg.audioMessage.url : null;
  }

  if (type === 'unknown') return null;

  return {
    _origen: 'whatsapp',
    phone: senderId,
    name: senderName,
    type,
    text,
    fileId: null,
    audioUrl,
    remoteJid,
    _rawMessage: msg,
    _rawKey: key,
    _messageId: key.id || '',
    timestamp: data.date_time || new Date().toISOString(),
  };
}

/**
 * Detecta el origen del payload crudo y delega al adaptador correspondiente.
 */
export function adaptarPayload(body: any): MensajeNormalizado | null {
  // Telegram: update con message.chat
  if (body?.message?.chat) {
    return adaptarTelegram(body);
  }
  // WhatsApp/Evolution: tiene data.key o body.data
  return adaptarWhatsapp(body);
}
