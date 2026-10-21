import { DedupeService } from './dedupe.service';

// Evolution reenvía el mismo mensaje si el webhook tarda: procesarlo dos veces
// registra dos veces el mismo animal.
describe('DedupeService', () => {
  const query = jest.fn();
  let service: DedupeService;

  beforeEach(() => {
    query.mockReset();
    service = new DedupeService({ query } as any);
  });

  it('extrae la clave de WhatsApp y de Telegram', () => {
    expect(service.extraerClave({ data: { key: { id: 'ABC' } } })).toBe('wsp:ABC');
    expect(service.extraerClave({ update_id: 5 })).toBe('tg:5');
    expect(service.extraerClave({})).toBeNull();
  });

  it('un mensaje nuevo no es duplicado y queda guardado en la base', async () => {
    query.mockResolvedValue([{ clave: 'wsp:1' }]);
    await expect(service.esDuplicado('wsp:1')).resolves.toBe(false);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO bot_mensajes_procesados');
  });

  // Caso del reinicio: la memoria está vacía pero la base ya lo tiene.
  it('es duplicado si la base ya lo tenía', async () => {
    query.mockResolvedValue([]);
    await expect(service.esDuplicado('wsp:2')).resolves.toBe(true);
  });

  it('un reintento inmediato se corta en memoria sin ir a la base', async () => {
    query.mockResolvedValue([{ clave: 'wsp:3' }]);
    await service.esDuplicado('wsp:3');
    query.mockClear();
    await expect(service.esDuplicado('wsp:3')).resolves.toBe(true);
    expect(query).not.toHaveBeenCalled();
  });

  it('si la base falla, igual deduplica en memoria', async () => {
    query.mockRejectedValue(new Error('sin conexión'));
    await expect(service.esDuplicado('wsp:4')).resolves.toBe(false);
    await expect(service.esDuplicado('wsp:4')).resolves.toBe(true);
  });

  it('sin clave nunca es duplicado', async () => {
    await expect(service.esDuplicado(null)).resolves.toBe(false);
    expect(query).not.toHaveBeenCalled();
  });
});
