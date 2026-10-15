import { sanearParaLog } from './sanear-log';

describe('sanearParaLog', () => {
  it('oculta contraseñas y tokens sin tocar el resto', () => {
    const salida = sanearParaLog({
      accion: 'x', phone: '549111', password: 'miclave', contrasena: 'otra', Authorization: 'Bearer abc',
      anidado: { bot_link_token: '12345678', rp: 5 },
      lista: [{ apiKey: 'k', rp: 1 }],
    });
    expect(salida).toEqual({
      accion: 'x', phone: '549111', password: '***', contrasena: '***', Authorization: '***',
      anidado: { bot_link_token: '***', rp: 5 },
      lista: [{ apiKey: '***', rp: 1 }],
    });
  });

  it('no rompe con null, texto o números', () => {
    expect(sanearParaLog(null)).toBeNull();
    expect(sanearParaLog('hola')).toBe('hola');
    expect(sanearParaLog(7)).toBe(7);
  });
});
