import { HttpStatus } from '@nestjs/common';
import { DiarreaTernerosService } from './diarrea-terneros.service';
import { crearTernero } from 'src/test-utils/ternero.factory';
import {
  queryBuilderFalso,
  repositorioFalso,
  statusDe,
} from 'src/test-utils/repositorio';

const MI_CAMPO = 10;
const OTRO_CAMPO = 20;

describe('DiarreaTernerosService', () => {
  let qb: ReturnType<typeof queryBuilderFalso>;
  let diarreas: ReturnType<typeof repositorioFalso>;
  let terneros: ReturnType<typeof repositorioFalso>;
  let service: DiarreaTernerosService;

  const alta = (datos: Record<string, any> = {}): any => ({
    id_ternero: 7,
    fecha_diarrea_ternero: '2026-10-10',
    severidad: 'Leve',
    id_establecimiento: MI_CAMPO,
    ...datos,
  });

  beforeEach(() => {
    qb = queryBuilderFalso({
      uno: { id_diarrea_ternero: 1, id_establecimiento: MI_CAMPO },
    });
    diarreas = repositorioFalso(qb);
    terneros = repositorioFalso();
    terneros.findOne.mockResolvedValue(
      crearTernero({ id_ternero: 7, id_establecimiento: MI_CAMPO }),
    );
    service = new DiarreaTernerosService(diarreas as any, terneros as any);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('alta', () => {
    it('numera el episodio según los anteriores del ternero', async () => {
      diarreas.count.mockResolvedValue(2);
      await service.create(alta());
      expect(diarreas.save).toHaveBeenCalledWith(
        expect.objectContaining({
          numero_episodio: 3,
          id_establecimiento: MI_CAMPO,
          fecha_diarrea_ternero: '2026-10-10T12:00:00',
          observaciones: '',
        }),
      );
    });

    it('sin establecimiento 403, ternero inexistente 404, de otro campo 403', async () => {
      expect(
        await statusDe(service.create(alta({ id_establecimiento: undefined }))),
      ).toBe(HttpStatus.FORBIDDEN);
      terneros.findOne.mockResolvedValueOnce(null);
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.NOT_FOUND);
      terneros.findOne.mockResolvedValueOnce(
        crearTernero({ id_establecimiento: OTRO_CAMPO }),
      );
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.FORBIDDEN);
      expect(diarreas.save).not.toHaveBeenCalled();
    });

    // El servicio imprimía el DTO completo en cada alta.
    it('no escribe el cuerpo del pedido en los logs', async () => {
      await service.create(alta({ observaciones: 'dato privado' }));
      const logs = JSON.stringify((console.log as jest.Mock).mock.calls);
      expect(logs).not.toContain('dato privado');
    });
  });

  describe('lectura, edición y baja', () => {
    it('un usuario común lista solo su campo, aunque pida otro', async () => {
      await service.findAll(MI_CAMPO, false, OTRO_CAMPO);
      expect(qb.where.mock.calls.concat(qb.andWhere.mock.calls)).toContainEqual(
        [
          'diarrea.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento: MI_CAMPO },
        ],
      );
    });

    it('uno de otro campo, 404', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.findOne(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });

    it('al editar no acepta un ternero de otro campo', async () => {
      terneros.findOne.mockResolvedValue(
        crearTernero({ id_establecimiento: OTRO_CAMPO }),
      );
      expect(
        await statusDe(
          service.update(1, { id_ternero: 99 } as any, MI_CAMPO, false),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
      expect(diarreas.save).not.toHaveBeenCalled();
    });

    it('borra solo si es del campo', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.remove(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
      expect(diarreas.remove).not.toHaveBeenCalled();
    });
  });
});
