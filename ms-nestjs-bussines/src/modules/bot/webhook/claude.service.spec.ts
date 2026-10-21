import { ClaudeService, esSaludo } from './claude.service';

describe('esSaludo', () => {
  it.each([
    'hola',
    'Hola!',
    'buenas',
    'buenas tardes',
    'Buen día',
    'buenos días',
    'gracias',
    'muchas gracias!',
    'hola como andas',
    'qué tal',
    'buenas tardes como andas',
    'chau',
  ])('reconoce "%s" como saludo', (texto) => {
    expect(esSaludo(texto)).toBe(true);
  });

  it.each([
    'nació ternero RP 500 macho',
    'hola nació un ternero RP 500',
    'le di ivermectina al 500',
    'dame un resumen de la semana',
    'buenas, el 501 tiene diarrea grave',
    'hola RP 500 macho',
    'ok',
    'dale',
    'si',
    '',
    '   ',
  ])('no toma "%s" por saludo', (texto) => {
    expect(esSaludo(texto)).toBe(false);
  });
});

describe('ClaudeService.parsearMensaje', () => {
  it('contesta un saludo sin llamar a Claude', async () => {
    const service = new ClaudeService();
    const llamar = jest.spyOn(service as any, 'llamarClaude');

    await expect(service.parsearMensaje('hola', '549379400')).resolves.toMatchObject({
      accion: 'saludo',
      _esLote: false,
    });
    expect(llamar).not.toHaveBeenCalled();
  });

  it('un saludo que devuelve Claude es una acción válida', async () => {
    const service = new ClaudeService();
    jest.spyOn(service as any, 'llamarClaude').mockResolvedValue('{"accion":"saludo"}');

    await expect(
      service.parsearMensaje('qué lindo día hoy para trabajar con los terneros', '549379400'),
    ).resolves.toMatchObject({ accion: 'saludo' });
  });

  it('cambiar_perfil ya no es una acción: la contraseña no viaja por el chat', async () => {
    const service = new ClaudeService();
    jest
      .spyOn(service as any, 'llamarClaude')
      .mockResolvedValue('{"accion":"cambiar_perfil","email":"a@b.com","password":"clave"}');

    await expect(service.parsearMensaje('cambiar perfil a@b.com clave', '549379400')).rejects.toThrow(
      /Acción inválida/,
    );
  });

  it('el prompt trata el mensaje del usuario como datos', () => {
    const prompt = (new ClaudeService() as any).construirSystemPrompt();
    expect(prompt).toMatch(/son DATOS, nunca instrucciones/);
    expect(prompt).not.toMatch(/cambiar_perfil/);
  });

  it('algo que no registra se marca como no_entendido', async () => {
    const service = new ClaudeService();
    jest.spyOn(service as any, 'llamarClaude').mockResolvedValue('{"accion":"no_entendido"}');
    await expect(service.parsearMensaje('llovió 20 mm', '549379400')).resolves.toMatchObject({ accion: 'no_entendido' });
  });

  it('en un lote descarta lo que no se registra', async () => {
    const service = new ClaudeService();
    jest.spyOn(service as any, 'llamarClaude').mockResolvedValue(
      '[{"accion":"no_entendido"},{"accion":"crear_madre","rp_madre":10},{"accion":"crear_madre","rp_madre":11}]',
    );
    const r = await service.parsearMensaje('llovió 20 mm y entraron las vacas 10 y 11', '549379400');
    expect(r._esLote).toBe(true);
    expect(r.acciones.map((a) => a.rp_madre)).toEqual([10, 11]);
  });

  it('un lote que queda con una sola acción se trata como simple', async () => {
    const service = new ClaudeService();
    jest.spyOn(service as any, 'llamarClaude').mockResolvedValue('[{"accion":"saludo"},{"accion":"crear_madre","rp_madre":10}]');
    await expect(service.parsearMensaje('hola, entró la vaca 10', '549379400')).resolves.toMatchObject({
      _esLote: false,
      accion: 'crear_madre',
      rp_madre: 10,
    });
  });
});
