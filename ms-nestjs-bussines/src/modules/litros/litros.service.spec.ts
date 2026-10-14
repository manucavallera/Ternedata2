import { HttpStatus } from '@nestjs/common';
import { LitrosService } from './litros.service';
import { repositorioFalso, statusDe } from 'src/test-utils/repositorio';

const CAMPO = 10;

describe('LitrosService', () => {
  let litros: ReturnType<typeof repositorioFalso>;
  let madres: ReturnType<typeof repositorioFalso>;
  let service: LitrosService;

  beforeEach(() => {
    litros = repositorioFalso();
    madres = repositorioFalso();
    madres.count.mockResolvedValue(25);
    service = new LitrosService(litros as any, madres as any);
  });

  describe('registrar', () => {
    it('devuelve el total del día (vendido + terneros)', async () => {
      const res = await service.registrar(
        {
          fecha: '2026-10-14',
          litros_vendido: 480,
          litros_terneros: 60,
          cantidad_vacas: 24,
        } as any,
        CAMPO,
      );
      expect(res).toMatchObject({
        litros_vendido: 480,
        litros_terneros: 60,
        total: 540,
        cantidad_vacas: 24,
      });
    });

    it('sin cantidad de vacas, guarda el conteo de madres "En Tambo" del campo', async () => {
      await service.registrar(
        {
          fecha: '2026-10-14',
          litros_vendido: 480,
          litros_terneros: 60,
        } as any,
        CAMPO,
      );
      expect(madres.count).toHaveBeenCalledWith({
        where: { id_establecimiento: CAMPO, estado: 'En Tambo' },
      });
      expect(litros.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cantidad_vacas: 25,
          id_establecimiento: CAMPO,
        }),
      );
    });

    it('acepta 0 vacas explícito sin reemplazarlo por el conteo', async () => {
      await service.registrar(
        {
          fecha: '2026-10-14',
          litros_vendido: 0,
          litros_terneros: 0,
          cantidad_vacas: 0,
        } as any,
        CAMPO,
      );
      expect(madres.count).not.toHaveBeenCalled();
    });
  });

  describe('estadísticas', () => {
    it('promedio por vaca del último registro, con las vacas de ese día', async () => {
      litros.findOne.mockResolvedValue({
        id_registro: 3,
        fecha: '2026-10-14',
        litros_vendido: '480.00',
        litros_terneros: '60.00',
        cantidad_vacas: 24,
      });
      expect(await service.getStats(CAMPO)).toMatchObject({
        total: 540,
        cantidad_vacas: 24,
        promedio: 22.5,
      });
    });

    it('un registro viejo sin vacas usa el conteo actual del rodeo', async () => {
      litros.findOne.mockResolvedValue({
        id_registro: 3,
        litros_vendido: 500,
        litros_terneros: 0,
        cantidad_vacas: null,
      });
      expect(await service.getStats(CAMPO)).toMatchObject({
        cantidad_vacas: 25,
        promedio: 20,
      });
    });

    it('sin registros devuelve ceros y sin promedio', async () => {
      expect(await service.getStats(CAMPO)).toMatchObject({
        total: 0,
        promedio: null,
        cantidad_vacas: 25,
      });
    });

    it('con 0 vacas no divide por cero', async () => {
      litros.findOne.mockResolvedValue({
        litros_vendido: 100,
        litros_terneros: 0,
        cantidad_vacas: 0,
      });
      expect((await service.getStats(CAMPO)).promedio).toBeNull();
    });
  });

  describe('editar y borrar', () => {
    it('busca el registro dentro del campo', async () => {
      expect(
        await statusDe(service.update(3, { litros_vendido: 1 } as any, CAMPO)),
      ).toBe(HttpStatus.NOT_FOUND);
      expect(litros.findOne).toHaveBeenCalledWith({
        where: { id_registro: 3, id_establecimiento: CAMPO },
      });
      expect(await statusDe(service.remove(3, CAMPO))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });

    it('edita solo los campos que vienen', async () => {
      litros.findOne.mockResolvedValue({
        id_registro: 3,
        litros_vendido: 480,
        litros_terneros: 60,
        cantidad_vacas: 24,
      });
      const res = await service.update(3, { cantidad_vacas: 23 } as any, CAMPO);
      expect(res).toMatchObject({
        litros_vendido: 480,
        litros_terneros: 60,
        cantidad_vacas: 23,
        total: 540,
      });
    });
  });
});
