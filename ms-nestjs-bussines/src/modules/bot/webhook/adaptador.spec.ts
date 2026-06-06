import {
  adaptarTelegram,
  adaptarWhatsapp,
  adaptarPayload,
} from './adaptador';

describe('adaptarTelegram', () => {
  it('normaliza un mensaje de texto', () => {
    const r = adaptarTelegram({
      message: {
        chat: { id: 123456 },
        from: { first_name: 'Manu' },
        date: 1749200000,
        text: 'nació un ternero',
      },
    });
    expect(r).toMatchObject({
      _origen: 'telegram',
      phone: '123456',
      name: 'Manu',
      type: 'text',
      text: 'nació un ternero',
    });
  });

  it('detecta audio (voice) y extrae fileId', () => {
    const r = adaptarTelegram({
      message: {
        chat: { id: 1 },
        from: { first_name: 'X' },
        date: 1749200000,
        voice: { file_id: 'AbC123' },
      },
    });
    expect(r?.type).toBe('audio');
    expect(r?.fileId).toBe('AbC123');
  });

  it('devuelve null sin message', () => {
    expect(adaptarTelegram({})).toBeNull();
  });

  it('usa nombre default si falta from', () => {
    const r = adaptarTelegram({
      message: { chat: { id: 9 }, date: 1749200000, text: 'hola' },
    });
    expect(r?.name).toBe('Ganadero');
  });
});

describe('adaptarWhatsapp', () => {
  const base = (over: any = {}) => ({
    data: {
      key: { remoteJid: '5491122334455@s.whatsapp.net', fromMe: false, id: 'MSG1' },
      message: { conversation: 'hola' },
      messageType: 'conversation',
      pushName: 'Juan',
      ...over,
    },
  });

  it('normaliza texto (conversation)', () => {
    const r = adaptarWhatsapp(base());
    expect(r).toMatchObject({
      _origen: 'whatsapp',
      phone: '5491122334455',
      type: 'text',
      text: 'hola',
      name: 'Juan',
    });
  });

  it('lee extendedTextMessage', () => {
    const r = adaptarWhatsapp(
      base({
        messageType: 'extendedTextMessage',
        message: { extendedTextMessage: { text: 'che' } },
      }),
    );
    expect(r?.text).toBe('che');
  });

  it('detecta audioMessage con url', () => {
    const r = adaptarWhatsapp(
      base({
        messageType: 'audioMessage',
        message: { audioMessage: { url: 'https://x/audio' } },
      }),
    );
    expect(r?.type).toBe('audio');
    expect(r?.audioUrl).toBe('https://x/audio');
  });

  it('descarta eco del bot (fromMe)', () => {
    const r = adaptarWhatsapp(
      base({ key: { remoteJid: '549@s.whatsapp.net', fromMe: true } }),
    );
    expect(r).toBeNull();
  });

  it('descarta grupos', () => {
    const r = adaptarWhatsapp(base({ key: { remoteJid: '123@g.us', fromMe: false } }));
    expect(r).toBeNull();
  });

  it('descarta status broadcast', () => {
    const r = adaptarWhatsapp(
      base({ key: { remoteJid: 'status@broadcast', fromMe: false } }),
    );
    expect(r).toBeNull();
  });

  it('descarta PENDING', () => {
    const r = adaptarWhatsapp(base({ status: 'PENDING' }));
    expect(r).toBeNull();
  });

  it('descarta tipo no soportado', () => {
    const r = adaptarWhatsapp(base({ messageType: 'imageMessage', message: {} }));
    expect(r).toBeNull();
  });
});

describe('adaptarPayload (router)', () => {
  it('rutea a Telegram cuando hay message.chat', () => {
    const r = adaptarPayload({
      message: { chat: { id: 5 }, from: { first_name: 'A' }, date: 1, text: 'x' },
    });
    expect(r?._origen).toBe('telegram');
  });

  it('rutea a WhatsApp en otro caso', () => {
    const r = adaptarPayload({
      data: {
        key: { remoteJid: '549@s.whatsapp.net', fromMe: false, id: 'M' },
        message: { conversation: 'x' },
        messageType: 'conversation',
      },
    });
    expect(r?._origen).toBe('whatsapp');
  });
});
