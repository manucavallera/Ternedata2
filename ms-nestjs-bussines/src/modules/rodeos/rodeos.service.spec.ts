import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RodeosService } from './rodeos.service';

// Rodeos: agrupan terneros y madres de UN establecimiento. Las reglas importantes
// son de aislamiento (nadie toca rodeos ni animales de otro campo) y de integridad
// (no borrar un rodeo con animales adentro).
const MI_CAMPO = 10;
const OTRO_CAMPO = 20;

const rodeo = (datos: Record<string, any> = {}) => ({
  id_rodeo: 5,
  nombre: 'Guachera',
  tipo: 'crianza',
  estado: 'activo',
  id_establecimiento: MI_CAMPO,
  ...datos,
});

describe('RodeosService', () => {
  let repo: Record<string, jest.Mock>;
  let queryBuilder: Record<string, jest.Mock>;
  let service: RodeosService;

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rodeo()),
      getMany: jest.fn().mockResolvedValue([rodeo()]),
    };
    repo = {
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => ({ id_rodeo: 9, ...d })),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn().mockResolvedValue([{ count: '0' }]),
    };
    service = new RodeosService(repo as any);
  });

  describe('listar', () => {
    it('un usuario común ve solo los rodeos de su campo, aunque pida otro', async () => {
      await service.findAll(MI_CAMPO, false, OTRO_CAMPO);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'rodeo.id_establecimiento = :id',
        { id: MI_CAMPO },
      );
    });

    it('sin establecimiento, rechaza', async () => {
      await expect(service.findAll(null, false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('super_admin puede filtrar por cualquier campo', async () => {
      await service.findAll(MI_CAMPO, true, OTRO_CAMPO);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'rodeo.id_establecimiento = :id',
        { id: OTRO_CAMPO },
      );
    });
  });

  describe('obtener uno', () => {
    it('404 si no existe', async () => {
      queryBuilder.getOne.mockResolvedValue(null);
      await expect(service.findOne(5, MI_CAMPO, false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('403 si es de otro campo', async () => {
      queryBuilder.getOne.mockResolvedValue(
        rodeo({ id_establecimiento: OTRO_CAMPO }),
      );
      await expect(service.findOne(5, MI_CAMPO, false)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('crear y editar', () => {
    it('crea en el campo seleccionado', async () => {
      await service.create(
        { nombre: 'Recría', id_establecimiento: MI_CAMPO } as any,
        MI_CAMPO,
        false,
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_establecimiento: MI_CAMPO }),
      );
    });

    it('no crea en otro campo, ni siendo admin', async () => {
      await expect(
        service.create(
          { nombre: 'Recría', id_establecimiento: OTRO_CAMPO } as any,
          MI_CAMPO,
          true,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no mueve un rodeo a otro campo', async () => {
      await expect(
        service.update(
          5,
          { id_establecimiento: OTRO_CAMPO } as any,
          MI_CAMPO,
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('activar/desactivar alterna el estado', async () => {
      await service.toggleEstado(5, MI_CAMPO, false);
      expect(repo.update).toHaveBeenCalledWith(
        { id_rodeo: 5 },
        { estado: 'inactivo' },
      );
    });
  });

  describe('eliminar', () => {
    it('elimina un rodeo vacío', async () => {
      await service.remove(5, MI_CAMPO, false);
      expect(repo.delete).toHaveBeenCalledWith({ id_rodeo: 5 });
    });

    it('no elimina un rodeo con terneros', async () => {
      repo.query.mockResolvedValueOnce([{ count: '3' }]);
      await expect(service.remove(5, MI_CAMPO, false)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    // La FK madres.id_rodeo no tiene ON DELETE: borrar un rodeo con madres daba 500.
    it('no elimina un rodeo con madres', async () => {
      repo.query
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '2' }]);
      await expect(service.remove(5, MI_CAMPO, false)).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  describe('asignar y desasignar animales', () => {
    const casos = [
      ['asignarTerneros', 'terneros'],
      ['desasignarTerneros', 'terneros'],
      ['asignarMadres', 'madres'],
      ['desasignarMadres', 'madres'],
    ] as const;

    it.each(casos)('%s exige al menos un animal', async (metodo) => {
      await expect(service[metodo](5, [], MI_CAMPO, false)).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each(casos)(
      '%s solo actualiza animales del propio campo',
      async (metodo, tabla) => {
        await service[metodo](5, [1, 2], MI_CAMPO, false);
        const [sql, params] = repo.query.mock.calls[0];
        expect(sql).toContain(`UPDATE ${tabla}`);
        expect(sql).toMatch(/id_establecimiento = \$4/);
        expect(params).toEqual([5, 1, 2, MI_CAMPO]);
      },
    );

    // Antes no se verificaba el rodeo: se podían meter animales propios en el
    // rodeo de otro campo (aparecían en sus listados y le impedían borrarlo).
    it.each(casos)('%s rechaza un rodeo de otro campo', async (metodo) => {
      queryBuilder.getOne.mockResolvedValue(
        rodeo({ id_establecimiento: OTRO_CAMPO }),
      );
      await expect(service[metodo](5, [1], MI_CAMPO, false)).rejects.toThrow(
        ForbiddenException,
      );
      expect(repo.query).not.toHaveBeenCalled();
    });

    it.each(casos)('%s rechaza un rodeo inexistente', async (metodo) => {
      queryBuilder.getOne.mockResolvedValue(null);
      await expect(service[metodo](5, [1], MI_CAMPO, false)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.query).not.toHaveBeenCalled();
    });
  });
});
