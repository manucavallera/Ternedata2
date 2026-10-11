import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizacionTipo } from '../establecimientos/organizacion-tipo.enum';
import { OrganizacionTipoGuard } from './organizacion-tipo.guard';

describe('OrganizacionTipoGuard', () => {
  const establecimientoRepository = { findOne: jest.fn() };
  let reflector: Reflector;
  let guard: OrganizacionTipoGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = new Reflector();
    guard = new OrganizacionTipoGuard(
      reflector,
      establecimientoRepository as any,
    );
  });

  function context(request: any): ExecutionContext {
    return {
      getHandler: () => context,
      getClass: () => OrganizacionTipoGuard,
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  }

  it('permite una organización del tipo requerido', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(OrganizacionTipo.FORRAJERIA);
    establecimientoRepository.findOne.mockResolvedValue({
      id_establecimiento: 7,
      tipo_organizacion: OrganizacionTipo.FORRAJERIA,
    });

    await expect(guard.canActivate(context({ id_establecimiento: 7 }))).resolves.toBe(true);
  });

  it('rechaza una ruta de forrajería cuando el contexto es ganadero', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(OrganizacionTipo.FORRAJERIA);
    establecimientoRepository.findOne.mockResolvedValue({
      id_establecimiento: 8,
      tipo_organizacion: OrganizacionTipo.GANADERIA,
    });

    await expect(guard.canActivate(context({ id_establecimiento: 8 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza una ruta tipada cuando no hay organización activa', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(OrganizacionTipo.FORRAJERIA);

    await expect(guard.canActivate(context({}))).rejects.toBeInstanceOf(ForbiddenException);
    expect(establecimientoRepository.findOne).not.toHaveBeenCalled();
  });
});
