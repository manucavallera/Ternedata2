import { HttpStatus } from '@nestjs/common';
import { SustitutoService } from './sustituto.service';
import { repositorioFalso, statusDe } from 'src/test-utils/repositorio';

const CAMPO = 10;

// Calculadora de sustituto lácteo: cuánto polvo por día y si conviene frente a la leche.
const calculo = (datos: Record<string, any> = {}): any => ({
  fecha: '2026-10-14',
  numero_terneros: 10,
  litros_por_ternero: 4,
  concentracion: 0.125, // 125 g de polvo por litro
  precio_sustituto_usd: 3,
  precio_leche: 400,
  cotizacion_dolar: 1000,
  ...datos,
});

describe('SustitutoService', () => {
  let repo: ReturnType<typeof repositorioFalso>;
  let service: SustitutoService;

  beforeEach(() => {
    repo = repositorioFalso();
    service = new SustitutoService(repo as any);
  });

  it('calcula litros, kg de polvo, costos y si conviene', async () => {
    // 10 terneros × 4 L = 40 L; × 0,125 = 5 kg; 5 × 3 USD × 1000 = $15.000; leche 40 × 400 = $16.000
    expect(await service.registrar(calculo(), CAMPO)).toMatchObject({
      litros_totales: 40,
      kg_sustituto: 5,
      costo_sustituto_dia: 15000,
      costo_leche_dia: 16000,
      ahorro_sustituto: 1000,
      conviene: 'sustituto',
      id_establecimiento: CAMPO,
    });
  });

  it('si el sustituto sale más caro, conviene la leche y el ahorro es negativo', async () => {
    const res = await service.registrar(
      calculo({ cotizacion_dolar: 1200 }),
      CAMPO,
    );
    expect(res).toMatchObject({
      costo_sustituto_dia: 18000,
      ahorro_sustituto: -2000,
      conviene: 'leche',
    });
  });

  it('usa 125 g/L y 0 tomas por defecto', async () => {
    await service.registrar(calculo({ concentracion: undefined }), CAMPO);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        concentracion: 0.125,
        tomas_manana: 0,
        tomas_tarde: 0,
      }),
    );
  });

  it('convierte los decimales que devuelve Postgres como texto', async () => {
    repo.find.mockResolvedValue([
      calculo({
        numero_terneros: '10',
        litros_por_ternero: '4.00',
        concentracion: '0.125',
      }),
    ]);
    const [res] = await service.findAll(CAMPO);
    expect(res).toMatchObject({
      numero_terneros: 10,
      litros_totales: 40,
      kg_sustituto: 5,
    });
  });

  it('editar y borrar solo dentro del campo', async () => {
    expect(
      await statusDe(service.update(1, { numero_terneros: 12 } as any, CAMPO)),
    ).toBe(HttpStatus.NOT_FOUND);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id_calculo: 1, id_establecimiento: CAMPO },
    });
    expect(await statusDe(service.remove(1, CAMPO))).toBe(HttpStatus.NOT_FOUND);
  });

  it('al editar recalcula con los valores nuevos', async () => {
    repo.findOne.mockResolvedValue(calculo());
    expect(
      await service.update(1, { numero_terneros: 12 } as any, CAMPO),
    ).toMatchObject({ litros_totales: 48, kg_sustituto: 6 });
  });
});
