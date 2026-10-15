import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { RolEstablecimientoService } from './rol-establecimiento.service';
import {
  contextoHttp,
  reflectorCon,
  usuarioJwt,
} from 'src/test-utils/contexto';

// Decide si el rol del usuario alcanza para el endpoint (@Roles). Con un campo en
// juego vale el rol EN ESE campo: se puede ser dueño de uno y operario en otro.
describe('RolesGuard', () => {
  let rolEn: jest.Mock;
  const guardCon = (roles: string[] | undefined) =>
    new RolesGuard(reflectorCon(roles), {
      rolEn,
    } as unknown as RolEstablecimientoService);
  const evaluar = (roles: string[] | undefined, request: Record<string, any>) =>
    guardCon(roles).canActivate(contextoHttp(request));

  beforeEach(() => {
    rolEn = jest.fn();
  });

  it('un endpoint sin @Roles es libre', async () => {
    await expect(
      evaluar(undefined, { user: usuarioJwt({ rol: 'operario' }) }),
    ).resolves.toBe(true);
  });

  it('sin usuario, rechaza', async () => {
    await expect(evaluar(['admin'], {})).rejects.toThrow(ForbiddenException);
  });

  it('super_admin pasa siempre, sin consultar el rol por campo', async () => {
    await expect(
      evaluar(['admin'], {
        user: usuarioJwt({ rol: 'super_admin' }),
        id_establecimiento: 10,
      }),
    ).resolves.toBe(true);
    expect(rolEn).not.toHaveBeenCalled();
  });

  describe('con un establecimiento en juego', () => {
    it('vale el rol en ese campo', async () => {
      rolEn.mockResolvedValue('veterinario');
      const user = usuarioJwt({ rol: 'admin' });
      await expect(
        evaluar(['veterinario', 'admin'], { user, id_establecimiento: 20 }),
      ).resolves.toBe(true);
      expect(rolEn).toHaveBeenCalledWith(user, 20);
    });

    // El caso que cerró el PR #3: admin de su campo, operario en el ajeno.
    it('un admin global que es operario en ese campo no pasa como admin', async () => {
      rolEn.mockResolvedValue('operario');
      await expect(
        evaluar(['admin'], {
          user: usuarioJwt({ rol: 'admin' }),
          id_establecimiento: 20,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('sin rol en ese campo, rechaza', async () => {
      rolEn.mockResolvedValue(null);
      await expect(
        evaluar(['operario'], {
          user: usuarioJwt({ rol: 'admin' }),
          id_establecimiento: 99,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sin establecimiento en juego', () => {
    it('alcanza con el rol global', async () => {
      await expect(
        evaluar(['admin'], { user: usuarioJwt({ rol: 'admin' }) }),
      ).resolves.toBe(true);
      expect(rolEn).not.toHaveBeenCalled();
    });

    it('o con el rol en alguno de sus campos; "dueno" vale como admin', async () => {
      const user = usuarioJwt({
        rol: 'operario',
        userEstablecimientos: [{ establecimientoId: 5, rol: 'dueno' }],
      });
      await expect(evaluar(['admin'], { user })).resolves.toBe(true);
    });

    it('un operario sin membresías de admin no pasa', async () => {
      const user = usuarioJwt({
        rol: 'operario',
        userEstablecimientos: [{ establecimientoId: 5, rol: 'operario' }],
      });
      await expect(evaluar(['admin'], { user })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
