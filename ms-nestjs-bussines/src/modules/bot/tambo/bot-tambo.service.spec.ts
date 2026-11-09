import { NotFoundException } from '@nestjs/common';
import {
  BotTamboService,
  formatearPendientes,
  normalizarResultado,
  normalizarTipo,
} from './bot-tambo.service';

const ctx = {
  idEstablecimiento: 7,
  idUsuario: 3,
  nombreEstablecimiento: 'La Lechera',
  fecha: '2026-11-09',
};

function crear(madre: any = { id_madre: 50, rp_madre: 331 }) {
  const tamboService = {
    crearEvento: jest.fn().mockResolvedValue({
      evento: {},
      madre: {
        estado_reproductivo: 'preñada',
        fecha_parto_probable: '2027-07-20',
        numero_servicios: 1,
      },
    }),
    pendientes: jest.fn(),
  };
  const madreRepo = { findOne: jest.fn().mockResolvedValue(madre) };
  const service = new BotTamboService(tamboService as any, madreRepo as any);
  return { service, tamboService, madreRepo };
}

describe('normalizar', () => {
  it('lleva los tipos que manda Claude al valor del backend', () => {
    expect(normalizarTipo('Inseminación')).toBe('inseminacion');
    expect(normalizarTipo('ecografía')).toBe('tacto');
    expect(normalizarTipo('reemparche')).toBe('parche');
    expect(normalizarTipo('parió')).toBe('parto');
    expect(normalizarTipo('preparto')).toBe('preparto');
    expect(normalizarTipo('secado')).toBe('secado');
    expect(normalizarTipo('abortó')).toBe('aborto');
    expect(normalizarTipo('descarte')).toBe('rechazo');
    expect(normalizarTipo('vacuna')).toBeNull();
    expect(normalizarTipo('')).toBeNull();
  });

  it('resultado del tacto', () => {
    expect(normalizarResultado('Preñada')).toBe('preñada');
    expect(normalizarResultado('prenada')).toBe('preñada');
    expect(normalizarResultado('vacía')).toBe('vacia');
    expect(normalizarResultado('')).toBeNull();
  });
});

describe('BotTamboService.registrarEvento', () => {
  it('anota un tacto preñada con la vaca del campo', async () => {
    const { service, tamboService, madreRepo } = crear();
    const r = await service.registrarEvento(
      {
        tipo: 'tacto',
        rp_madre: 331,
        resultado: 'preñada',
        dias_gestacion: 45,
      },
      ctx,
    );
    expect(madreRepo.findOne).toHaveBeenCalledWith({
      where: { rp_madre: 331, id_establecimiento: 7 },
    });
    expect(tamboService.crearEvento).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        id_madre: 50,
        tipo: 'tacto',
        resultado: 'preñada',
        dias_gestacion: 45,
        fecha: '2026-11-09',
      }),
      3,
    );
    expect(r.success).toBe(true);
    expect(r.mensaje).toContain('Anotado: Tacto');
    expect(r.mensaje).toContain('Parto probable: 2027-07-20');
  });

  it('inseminación guarda el toro y no manda resultado', async () => {
    const { service, tamboService } = crear();
    const r = await service.registrarEvento(
      {
        tipo: 'inseminacion',
        rp_madre: 333,
        toro: 'Faraón',
        resultado: 'preñada',
      },
      ctx,
    );
    const dto = tamboService.crearEvento.mock.calls[0][1];
    expect(dto.toro).toBe('Faraón');
    expect(dto.resultado).toBeUndefined();
    expect(r.mensaje).toContain('Pajuela: Faraón');
  });

  it('tacto sin resultado pregunta y no escribe', async () => {
    const { service, tamboService } = crear();
    const r = await service.registrarEvento(
      { tipo: 'tacto', rp_madre: 331 },
      ctx,
    );
    expect(r.success).toBe(false);
    expect(r.mensaje).toContain('preñada o vacía');
    expect(tamboService.crearEvento).not.toHaveBeenCalled();
  });

  it('sin RP o tipo desconocido no escribe', async () => {
    const { service, tamboService } = crear();
    expect(
      (await service.registrarEvento({ tipo: 'parto', rp_madre: 0 }, ctx))
        .mensaje,
    ).toContain('RP de la vaca');
    expect(
      (await service.registrarEvento({ tipo: 'vacuna', rp_madre: 5 }, ctx))
        .mensaje,
    ).toContain('No entendí');
    expect(tamboService.crearEvento).not.toHaveBeenCalled();
  });

  it('vaca de otro campo o inexistente', async () => {
    const { service, tamboService } = crear(null);
    const r = await service.registrarEvento(
      { tipo: 'parto', rp_madre: 999 },
      ctx,
    );
    expect(r.mensaje).toContain('No encontré la vaca RP 999');
    expect(tamboService.crearEvento).not.toHaveBeenCalled();
  });

  it('un error de validación del backend vuelve como mensaje', async () => {
    const { service, tamboService } = crear();
    tamboService.crearEvento.mockRejectedValue(
      new NotFoundException('Vaca no encontrada en este establecimiento'),
    );
    const r = await service.registrarEvento(
      { tipo: 'secado', rp_madre: 331 },
      ctx,
    );
    expect(r.success).toBe(false);
    expect(r.mensaje).toContain('Vaca no encontrada');
  });
});

describe('pendientes', () => {
  const vacio = {
    reemparche: [],
    a_tactar: [],
    sin_inseminar: [],
    a_reconfirmar: [],
    a_secar: [],
    a_preparto: [],
    parto_proximo: [],
  };

  it('lista los grupos con vacas, las que llevan más días primero', () => {
    const txt = formatearPendientes({
      ...vacio,
      a_tactar: [
        { id_madre: 1, rp_madre: 10, nombre: '', dias: 36 },
        { id_madre: 2, rp_madre: 20, nombre: '', dias: 50 },
      ],
    });
    expect(txt).toContain('*Para tactar* (2): RP 20, RP 10');
    expect(txt).not.toContain('OK para inseminar');
  });

  it('sin pendientes', () => {
    expect(formatearPendientes(vacio)).toContain('No hay pendientes');
    expect(formatearPendientes(vacio, 'a_secar')).toContain('Para secar');
  });

  it('corta los grupos largos', () => {
    const muchas = Array.from({ length: 20 }, (_, i) => ({
      id_madre: i,
      rp_madre: i,
      nombre: '',
      dias: i,
    }));
    expect(formatearPendientes({ ...vacio, sin_inseminar: muchas })).toContain(
      'y 5 más',
    );
  });

  it('consultarPendientes filtra por grupo válido', async () => {
    const { service, tamboService } = crear();
    tamboService.pendientes.mockResolvedValue({
      pendientes: {
        ...vacio,
        a_secar: [{ id_madre: 1, rp_madre: 5, nombre: '', dias: 40 }],
        a_tactar: [{ id_madre: 2, rp_madre: 6, nombre: '', dias: 40 }],
      },
    });
    const r = await service.consultarPendientes({ grupo: 'a_secar' }, ctx);
    expect(r.mensaje).toContain('Para secar');
    expect(r.mensaje).not.toContain('Para tactar');
    const todos = await service.consultarPendientes(
      { grupo: 'cualquiera' },
      ctx,
    );
    expect(todos.mensaje).toContain('Para tactar');
  });
});
