import { HttpException, HttpStatus } from '@nestjs/common';
import { TernerosService } from './terneros.service';
import { crearMadre, crearTernero } from 'src/test-utils/ternero.factory';

const MI_CAMPO = 10;

const statusDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : error;
  }
  throw new Error('Se esperaba un error');
};

describe('TernerosService - edición', () => {
  let terneroRepository: Record<string, jest.Mock>;
  let madreRepository: Record<string, jest.Mock>;
  let service: TernerosService;
  const actual = () =>
    crearTernero({
      id_ternero: 7,
      rp_ternero: 501,
      id_establecimiento: MI_CAMPO,
    });

  beforeEach(() => {
    terneroRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (t) => t),
    };
    madreRepository = { findOne: jest.fn().mockResolvedValue(null) };
    service = new TernerosService(
      terneroRepository as any,
      madreRepository as any,
      {} as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(service, 'findOne').mockImplementation(async () => actual());
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  it('valida el ternero contra el campo del usuario', async () => {
    await service.update(7, { observaciones: 'ok' } as any, MI_CAMPO, false);
    expect(service.findOne).toHaveBeenCalledWith(7, MI_CAMPO, false);
  });

  it('no deja cambiar el establecimiento', async () => {
    await service.update(7, { id_establecimiento: 99 } as any, MI_CAMPO, false);
    expect(terneroRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id_establecimiento: MI_CAMPO }),
    );
  });

  it('una madre nueva tiene que ser del mismo campo', async () => {
    expect(
      await statusDe(
        service.update(7, { id_madre: 3 } as any, MI_CAMPO, false),
      ),
    ).toBe(HttpStatus.NOT_FOUND);
    expect(madreRepository.findOne).toHaveBeenCalledWith({
      where: { id_madre: 3, id_establecimiento: MI_CAMPO },
    });
    madreRepository.findOne.mockResolvedValue(crearMadre({ id_madre: 3 }));
    await service.update(7, { id_madre: 3 } as any, MI_CAMPO, false);
    expect(terneroRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        madre: expect.objectContaining({ id_madre: 3 }),
      }),
    );
  });

  // La base no tiene índice único por campo: sin este chequeo quedaban RP duplicados.
  it('no deja cambiar el RP por uno que ya usa otro ternero del campo', async () => {
    terneroRepository.findOne.mockResolvedValue(
      crearTernero({ id_ternero: 8, rp_ternero: 600 }),
    );
    expect(
      await statusDe(
        service.update(7, { rp_ternero: 600 } as any, MI_CAMPO, false),
      ),
    ).toBe(HttpStatus.CONFLICT);
    expect(terneroRepository.findOne).toHaveBeenCalledWith({
      where: { rp_ternero: 600, id_establecimiento: MI_CAMPO },
    });
    expect(terneroRepository.save).not.toHaveBeenCalled();
  });

  it('guardar el mismo RP no choca consigo mismo', async () => {
    await service.update(7, { rp_ternero: 501 } as any, MI_CAMPO, false);
    expect(terneroRepository.save).toHaveBeenCalled();
  });
});
