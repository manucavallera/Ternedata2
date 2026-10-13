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
});
