import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { TernerosService } from './terneros.service';
import {
  crearMadre,
  crearTernero,
  haceDias,
} from 'src/test-utils/ternero.factory';

// Reglas de negocio del alta de un ternero. El repositorio de TypeORM se reemplaza
// por dobles: acá se prueba la lógica del servicio, no las consultas.
const HOY = new Date('2026-10-14T12:00:00Z');

// Mismo cuerpo que manda la web al dar de alta (los hitos van en 0 hasta pesarlos).
const altaValida = (datos: Record<string, any> = {}): any => ({
  rp_ternero: 501,
  sexo: 'Macho',
  estado: 'Vivo',
  peso_nacer: 40,
  peso_15d: 0,
  peso_30d: 0,
  peso_45d: 0,
  peso_largado: 0,
  peso_ideal: 80,
  fecha_nacimiento: haceDias(3, HOY),
  id_establecimiento: 10,
  ...datos,
});

const statusDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : error;
  }
  throw new Error('Se esperaba un error y el alta pasó');
};

describe('TernerosService - alta de ternero', () => {
  let terneroRepository: Record<string, jest.Mock>;
  let madreRepository: Record<string, jest.Mock>;
  let rodeoRepository: Record<string, jest.Mock>;
  let service: TernerosService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOY);
  });
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    terneroRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(() => crearTernero({ id_ternero: undefined })),
      // TypeORM devuelve la misma entidad guardada: se conserva el prototipo con sus métodos
      save: jest.fn(async (t) => Object.assign(t, { id_ternero: 99 })),
    };
    madreRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (m) => m),
    };
    rodeoRepository = {
      findOne: jest.fn().mockResolvedValue({ id_rodeo: 7, tipo: 'tambo' }),
      create: jest.fn((r) => r),
      save: jest.fn(async (r) => ({ ...r, id_rodeo: 8 })),
    };
    service = new TernerosService(
      terneroRepository as any,
      madreRepository as any,
      rodeoRepository as any,
      {} as any,
      {} as any,
    );
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  it('crea el ternero en el establecimiento y devuelve sus indicadores', async () => {
    const creado = await service.create(altaValida());
    expect(terneroRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        rp_ternero: 501,
        id_establecimiento: 10,
        peso_nacer: 40,
      }),
    );
    expect(creado.dias_desde_nacimiento).toBe(3);
  });

  it('exige establecimiento', async () => {
    await expect(
      service.create(altaValida({ id_establecimiento: undefined })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza una fecha de nacimiento futura', async () => {
    expect(
      await statusDe(
        service.create(altaValida({ fecha_nacimiento: '2026-11-01' })),
      ),
    ).toBe(HttpStatus.BAD_REQUEST);
  });

  it('no permite repetir el RP dentro del mismo establecimiento', async () => {
    terneroRepository.findOne.mockResolvedValue(
      crearTernero({ rp_ternero: 501 }),
    );
    expect(await statusDe(service.create(altaValida()))).toBe(
      HttpStatus.CONFLICT,
    );
    expect(terneroRepository.findOne).toHaveBeenCalledWith({
      where: { rp_ternero: 501, id_establecimiento: 10 },
    });
  });

  it('traduce la violación de unique de Postgres (carrera entre dos altas) a 409', async () => {
    terneroRepository.save.mockRejectedValue(
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );
    expect(await statusDe(service.create(altaValida()))).toBe(
      HttpStatus.CONFLICT,
    );
  });

  describe('con madre', () => {
    it('busca la madre solo dentro del mismo establecimiento', async () => {
      expect(await statusDe(service.create(altaValida({ id_madre: 3 })))).toBe(
        HttpStatus.NOT_FOUND,
      );
      expect(madreRepository.findOne).toHaveBeenCalledWith({
        where: { id_madre: 3, id_establecimiento: 10 },
      });
    });

    it('rechaza un ternero nacido antes que su madre', async () => {
      madreRepository.findOne.mockResolvedValue(
        crearMadre({ fecha_nacimiento: new Date(haceDias(1, HOY)) }),
      );
      expect(await statusDe(service.create(altaValida({ id_madre: 3 })))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });

    it('al parir, la madre pasa a "En Tambo" y entra al rodeo tambo', async () => {
      const madre = crearMadre({ estado: 'Seca', id_rodeo: null });
      madreRepository.findOne.mockResolvedValue(madre);
      await service.create(altaValida({ id_madre: 3 }));
      expect(madreRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'En Tambo', id_rodeo: 7 }),
      );
    });

    it('si el campo no tiene rodeo tambo, lo crea', async () => {
      madreRepository.findOne.mockResolvedValue(crearMadre({ estado: 'Seca' }));
      rodeoRepository.findOne.mockResolvedValue(null);
      await service.create(altaValida({ id_madre: 3 }));
      expect(rodeoRepository.create).toHaveBeenCalledWith({
        nombre: 'Tambo',
        tipo: 'tambo',
        id_establecimiento: 10,
      });
      expect(madreRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id_rodeo: 8 }),
      );
    });

    it('una madre que ya está en tambo no se toca', async () => {
      madreRepository.findOne.mockResolvedValue(
        crearMadre({ estado: 'En Tambo', id_rodeo: 7 }),
      );
      await service.create(altaValida({ id_madre: 3 }));
      expect(madreRepository.save).not.toHaveBeenCalled();
    });
  });

  it('guarda los datos de calostrado cuando vienen', async () => {
    await service.create(
      altaValida({
        metodo_calostrado: 'mamadera',
        litros_calostrado: 3,
        fecha_hora_calostrado: '2026-10-11T07:30',
      }),
    );
    expect(terneroRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metodo_calostrado: 'mamadera',
        litros_calostrado: 3,
        fecha_hora_calostrado: new Date('2026-10-11T07:30'),
      }),
    );
  });
});
