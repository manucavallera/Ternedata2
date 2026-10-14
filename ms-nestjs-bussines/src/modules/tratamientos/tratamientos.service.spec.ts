import { HttpStatus } from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { crearTernero } from 'src/test-utils/ternero.factory';
import {
  queryBuilderFalso,
  repositorioFalso,
  statusDe,
} from 'src/test-utils/repositorio';

const MI_CAMPO = 10;
const OTRO_CAMPO = 20;

describe('TratamientosService', () => {
  let qb: ReturnType<typeof queryBuilderFalso>;
  let tratamientos: ReturnType<typeof repositorioFalso>;
  let terneros: ReturnType<typeof repositorioFalso>;
  let service: TratamientosService;

  const alta = (datos: Record<string, any> = {}): any => ({
    nombre: 'Enrofloxacina',
    tipo_enfermedad: 'Neumonía',
    turno: 'mañana',
    fecha_tratamiento: '2026-10-10',
    id_ternero: 7,
    id_establecimiento: MI_CAMPO,
    ...datos,
  });

  beforeEach(() => {
    qb = queryBuilderFalso({
      uno: { id_tratamiento: 1, id_establecimiento: MI_CAMPO },
    });
    tratamientos = repositorioFalso(qb);
    terneros = repositorioFalso();
    terneros.findOne.mockResolvedValue(
      crearTernero({ id_ternero: 7, id_establecimiento: MI_CAMPO }),
    );
    service = new TratamientosService(tratamientos as any, terneros as any);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('alta', () => {
    it('guarda el tratamiento en el campo, con descripción vacía si no viene', async () => {
      await service.create(alta());
      expect(tratamientos.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id_establecimiento: MI_CAMPO,
          descripcion: '',
          nombre: 'Enrofloxacina',
        }),
      );
    });

    it('sin establecimiento, 403', async () => {
      expect(
        await statusDe(service.create(alta({ id_establecimiento: undefined }))),
      ).toBe(HttpStatus.FORBIDDEN);
    });

    it('ternero inexistente, 404', async () => {
      terneros.findOne.mockResolvedValue(null);
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.NOT_FOUND);
    });

    it('ternero de otro campo, 403', async () => {
      terneros.findOne.mockResolvedValue(
        crearTernero({ id_establecimiento: OTRO_CAMPO }),
      );
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.FORBIDDEN);
      expect(tratamientos.save).not.toHaveBeenCalled();
    });
  });

  describe('lectura', () => {
    it('un usuario común lista solo su campo, aunque pida otro', async () => {
      await service.findAll(MI_CAMPO, false, OTRO_CAMPO);
      expect(qb.where.mock.calls.concat(qb.andWhere.mock.calls)).toContainEqual(
        [
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento: MI_CAMPO },
        ],
      );
    });

    it('buscar uno filtra por el campo del usuario', async () => {
      await service.findOne(1, MI_CAMPO, false);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tratamiento.id_establecimiento = :idEstablecimiento',
        {
          idEstablecimiento: MI_CAMPO,
        },
      );
    });

    it('uno de otro campo (no aparece), 404', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.findOne(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('edición y baja', () => {
    it('no deja cambiar el establecimiento', async () => {
      await service.update(
        1,
        { id_establecimiento: OTRO_CAMPO, nombre: 'Otro' } as any,
        MI_CAMPO,
        false,
      );
      expect(tratamientos.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_establecimiento: MI_CAMPO }),
      );
    });

    it('no deja pasar el tratamiento a un ternero de otro campo', async () => {
      terneros.findOne.mockResolvedValue(
        crearTernero({ id_establecimiento: OTRO_CAMPO }),
      );
      expect(
        await statusDe(
          service.update(1, { id_ternero: 99 } as any, MI_CAMPO, false),
        ),
      ).toBe(HttpStatus.FORBIDDEN);
      expect(tratamientos.save).not.toHaveBeenCalled();
    });

    it('borra solo si es del campo', async () => {
      qb.getOne.mockResolvedValue(null);
      expect(await statusDe(service.remove(1, MI_CAMPO, false))).toBe(
        HttpStatus.NOT_FOUND,
      );
      expect(tratamientos.remove).not.toHaveBeenCalled();
    });
  });
});
