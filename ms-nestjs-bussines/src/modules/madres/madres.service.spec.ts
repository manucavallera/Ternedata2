import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { MadresService } from './madres.service';
import { crearMadre, haceDias } from 'src/test-utils/ternero.factory';

const HOY = new Date('2026-10-14T12:00:00Z');
const MI_CAMPO = 10;

const statusDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : error;
  }
  throw new Error('Se esperaba un error');
};

describe('MadresService', () => {
  let repo: Record<string, jest.Mock>;
  let qb: Record<string, jest.Mock>;
  let service: MadresService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOY);
  });
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(
        crearMadre({
          id_madre: 3,
          rp_madre: 200,
          id_establecimiento: MI_CAMPO,
        }),
      ),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    repo = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d),
      save: jest.fn(async (d) => d),
      remove: jest.fn(),
    };
    service = new MadresService(repo as any);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  describe('alta', () => {
    const alta = (datos: Record<string, any> = {}): any => ({
      rp_madre: 200,
      nombre: 'Clarita',
      estado: 'Seca',
      fecha_nacimiento: '2022-03-15',
      id_establecimiento: MI_CAMPO,
      ...datos,
    });

    it('crea la madre en el campo', async () => {
      await service.create(alta());
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          rp_madre: 200,
          id_establecimiento: MI_CAMPO,
        }),
      );
    });

    it('exige establecimiento', async () => {
      await expect(
        service.create(alta({ id_establecimiento: undefined })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no repite RP dentro del campo', async () => {
      repo.findOne.mockResolvedValue(crearMadre({ rp_madre: 200 }));
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.CONFLICT);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { rp_madre: 200, id_establecimiento: MI_CAMPO },
      });
    });

    it('traduce errores de Postgres: unique 409, FK 400', async () => {
      repo.save.mockRejectedValueOnce(
        Object.assign(new Error('dup'), { code: '23505' }),
      );
      expect(await statusDe(service.create(alta()))).toBe(HttpStatus.CONFLICT);
      repo.save.mockRejectedValueOnce(
        Object.assign(new Error('fk'), { code: '23503' }),
      );
      expect(await statusDe(service.create(alta()))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('listado', () => {
    it('un usuario común lista solo su campo, aunque pida otro', async () => {
      await service.findAll(MI_CAMPO, false, 99);
      expect(qb.where).toHaveBeenCalledWith(
        'madre.id_establecimiento = :idEstablecimiento',
        { idEstablecimiento: MI_CAMPO },
      );
    });

    it('aplica filtros de rodeo, búsqueda y estado, y pagina', async () => {
      qb.getManyAndCount.mockResolvedValue([[crearMadre()], 45]);
      const res = await service.findAll(
        MI_CAMPO,
        false,
        null,
        true,
        null,
        2,
        20,
        'Clar',
        'Seca',
      );
      expect(qb.andWhere).toHaveBeenCalledWith('madre.id_rodeo IS NULL');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        { search: '%Clar%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('madre.estado = :estado', {
        estado: 'Seca',
      });
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(res).toMatchObject({ total: 45, page: 2, totalPages: 3 });
    });

    // Antes el 400 quedaba atrapado por el catch general y salía como 500.
    it('sin establecimiento responde 400', async () => {
      expect(await statusDe(service.findAll(null, false))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('días en leche', () => {
    it('cuenta desde el último parto de una madre en tambo', async () => {
      qb.getOne.mockResolvedValue(
        crearMadre({
          estado: 'En Tambo',
          terneros: [
            { fecha_nacimiento: haceDias(120, HOY) },
            { fecha_nacimiento: haceDias(30, HOY) },
          ] as any,
        }),
      );
      expect((await service.findOne(3, MI_CAMPO, false)).dias_en_leche).toBe(
        30,
      );
    });

    it('no aplica a una madre seca o sin crías', async () => {
      qb.getOne.mockResolvedValue(
        crearMadre({
          estado: 'Seca',
          terneros: [{ fecha_nacimiento: haceDias(30, HOY) }] as any,
        }),
      );
      expect(
        (await service.findOne(3, MI_CAMPO, false)).dias_en_leche,
      ).toBeNull();
      qb.getOne.mockResolvedValue(
        crearMadre({ estado: 'En Tambo', terneros: [] }),
      );
      expect(
        (await service.findOne(3, MI_CAMPO, false)).dias_en_leche,
      ).toBeNull();
    });
  });

  describe('edición y baja', () => {
    it('una madre de otro campo da 404', async () => {
      qb.getOne.mockResolvedValue(null);
      await expect(service.findOne(3, MI_CAMPO, false)).rejects.toThrow(
        NotFoundException,
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'madre.id_establecimiento = :idEstablecimiento',
        { idEstablecimiento: MI_CAMPO },
      );
    });

    it('no deja cambiar el establecimiento', async () => {
      await service.update(
        3,
        { nombre: 'Nueva', id_establecimiento: 99 } as any,
        MI_CAMPO,
        false,
      );
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Nueva',
          id_establecimiento: MI_CAMPO,
        }),
      );
    });

    // La base no tiene índice único por campo: sin este chequeo quedaban RP duplicados.
    it('no deja cambiar el RP por uno que ya usa otra madre del campo', async () => {
      repo.findOne.mockResolvedValue(
        crearMadre({ id_madre: 8, rp_madre: 300 }),
      );
      expect(
        await statusDe(
          service.update(3, { rp_madre: 300 } as any, MI_CAMPO, false),
        ),
      ).toBe(HttpStatus.CONFLICT);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('guardar el mismo RP no choca consigo misma', async () => {
      await service.update(
        3,
        { rp_madre: 200, nombre: 'Igual' } as any,
        MI_CAMPO,
        false,
      );
      expect(repo.save).toHaveBeenCalled();
    });

    it('elimina solo una madre del propio campo', async () => {
      await service.remove(3, MI_CAMPO, false);
      expect(repo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id_madre: 3 }),
      );
    });
  });
});
