import { HttpStatus } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { crearMadre, crearTernero } from 'src/test-utils/ternero.factory';
import {
  queryBuilderFalso,
  repositorioFalso,
  statusDe,
} from 'src/test-utils/repositorio';

const MI_CAMPO = 10;
const OTRO_CAMPO = 20;

describe('EventosService', () => {
  let qb: ReturnType<typeof queryBuilderFalso>;
  let eventos: ReturnType<typeof repositorioFalso>;
  let terneros: ReturnType<typeof repositorioFalso>;
  let madres: ReturnType<typeof repositorioFalso>;
  let service: EventosService;

  const alta = (datos: Record<string, any> = {}): any => ({
    fecha_evento: '2026-10-10',
    observacion: 'Vacunación aftosa',
    id_ternero: [1, 2],
    id_madre: [5],
    id_establecimiento: MI_CAMPO,
    ...datos,
  });

  beforeEach(() => {
    qb = queryBuilderFalso({
      uno: {
        id_evento: 1,
        id_establecimiento: MI_CAMPO,
        terneros: [],
        madres: [],
      },
    });
    eventos = repositorioFalso(qb);
    terneros = repositorioFalso();
    madres = repositorioFalso();
    terneros.findBy.mockResolvedValue([
      crearTernero({ id_ternero: 1, id_establecimiento: MI_CAMPO }),
      crearTernero({ id_ternero: 2, id_establecimiento: MI_CAMPO }),
    ]);
    madres.findBy.mockResolvedValue([
      crearMadre({ id_madre: 5, id_establecimiento: MI_CAMPO }),
    ]);
    service = new EventosService(
      eventos as any,
      terneros as any,
      madres as any,
    );
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('alta', () => {
    it('guarda el evento con sus animales y la fecha al mediodía (evita corrimiento por zona horaria)', async () => {
      await service.create(alta());
      expect(eventos.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_establecimiento: MI_CAMPO,
          fecha_evento: new Date('2026-10-10T12:00:00'),
          terneros: expect.arrayContaining([
            expect.objectContaining({ id_ternero: 1 }),
          ]),
          madres: [expect.objectContaining({ id_madre: 5 })],
        }),
      );
    });

    it('sin establecimiento, 403', async () => {
      expect(
        await statusDe(service.create(alta({ id_establecimiento: undefined }))),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('rechaza terneros o madres de otro campo', async () => {
      terneros.findBy.mockResolvedValue([
        crearTernero({ id_ternero: 1, id_establecimiento: OTRO_CAMPO }),
      ]);
      expect(
        await statusDe(
          service.create(alta({ id_ternero: [1], id_madre: undefined })),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
      terneros.findBy.mockResolvedValue([]);
      madres.findBy.mockResolvedValue([
        crearMadre({ id_madre: 5, id_establecimiento: OTRO_CAMPO }),
      ]);
      expect(
        await statusDe(service.create(alta({ id_ternero: undefined }))),
      ).toBe(HttpStatus.FORBIDDEN);
      expect(eventos.save).not.toHaveBeenCalled();
    });

    // Antes un id inexistente se descartaba en silencio: el evento quedaba con menos
    // animales de los pedidos (o sin ninguno) y la respuesta era 201.
    it('rechaza ids de animales que no existen', async () => {
      terneros.findBy.mockResolvedValue([
        crearTernero({ id_ternero: 1, id_establecimiento: MI_CAMPO }),
      ]);
      expect(
        await statusDe(
          service.create(alta({ id_ternero: [1, 999], id_madre: undefined })),
        ),
      ).toBe(HttpStatus.NOT_FOUND);
      expect(eventos.save).not.toHaveBeenCalled();
    });
  });

  describe('lectura, edición y baja', () => {
    it('buscar uno filtra por el campo del usuario', async () => {
      await service.findOne(1, MI_CAMPO, false);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'evento.id_establecimiento = :idEstablecimiento',
        {
          idEstablecimiento: MI_CAMPO,
        },
      );
    });

    it('uno de otro campo, 404', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.findOne(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });

    it('al editar no acepta animales de otro campo', async () => {
      terneros.findBy.mockResolvedValue([
        crearTernero({ id_ternero: 3, id_establecimiento: OTRO_CAMPO }),
      ]);
      expect(
        await statusDe(
          service.update(1, { id_ternero: [3] } as any, MI_CAMPO, false),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
      expect(eventos.save).not.toHaveBeenCalled();
    });

    // Antes el 404 se convertía en 409.
    it('borra solo si es del campo', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.remove(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
      expect(eventos.remove).not.toHaveBeenCalled();
    });

    // Antes las listas se reemplazaban siempre: editar solo la observación dejaba
    // el evento sin animales.
    it('editar la observación conserva los animales', async () => {
      const animales = {
        terneros: [crearTernero({ id_ternero: 1 })],
        madres: [crearMadre({ id_madre: 5 })],
      };
      qb.getOne.mockResolvedValue({
        id_evento: 1,
        id_establecimiento: MI_CAMPO,
        ...animales,
      });
      await service.update(
        1,
        { observacion: 'Corregida' } as any,
        MI_CAMPO,
        false,
      );
      expect(eventos.save).toHaveBeenCalledWith(
        expect.objectContaining({ observacion: 'Corregida', ...animales }),
      );
    });

    it('la fecha editada queda al mediodía, igual que en el alta', async () => {
      await service.update(
        1,
        { fecha_evento: '2026-10-11' } as any,
        MI_CAMPO,
        false,
      );
      expect(eventos.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_evento: new Date('2026-10-11T12:00:00'),
        }),
      );
    });

    it('listar sin establecimiento responde 400, no 500', async () => {
      expect(await statusDe(service.findAll(null, false))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });
  });
});
