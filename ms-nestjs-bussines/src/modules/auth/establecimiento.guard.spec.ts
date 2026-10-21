import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { EstablecimientoGuard } from './establecimiento.guard';
import {
  contextoHttp,
  reflectorCon,
  usuarioJwt,
} from 'src/test-utils/contexto';

// Fija en qué establecimiento opera cada pedido. Es la barrera que aísla los
// datos entre campos: cualquier hueco acá deja ver o tocar el campo de otro.
describe('EstablecimientoGuard', () => {
  const guard = new EstablecimientoGuard(reflectorCon(undefined));
  const pasar = (request: Record<string, any>) => {
    guard.canActivate(contextoHttp(request));
    return request;
  };

  const invitado = usuarioJwt({
    id_establecimiento: 10,
    userEstablecimientos: [{ establecimientoId: 20, rol: 'operario' }],
  });

  it('sin pedido explícito usa el establecimiento principal', () => {
    const request = pasar({ user: invitado, query: {} });
    expect(request.id_establecimiento).toBe(10);
    expect(request.establecimientos_permitidos).toEqual([10, 20]);
  });

  it('deja cambiar a un campo al que fue invitado, por query o por body', () => {
    expect(
      pasar({ user: invitado, query: { id_establecimiento: '20' } })
        .id_establecimiento,
    ).toBe(20);
    expect(
      pasar({ user: invitado, query: {}, body: { id_establecimiento: 20 } })
        .id_establecimiento,
    ).toBe(20);
  });

  it('rechaza un campo ajeno', () => {
    expect(() =>
      pasar({ user: invitado, query: { id_establecimiento: '99' } }),
    ).toThrow(ForbiddenException);
  });

  it('rechaza un id que no es número', () => {
    expect(() =>
      pasar({ user: invitado, query: { id_establecimiento: 'abc' } }),
    ).toThrow(ForbiddenException);
  });

  it('ignora un id vacío y usa el principal', () => {
    expect(
      pasar({ user: invitado, query: { id_establecimiento: '' } })
        .id_establecimiento,
    ).toBe(10);
  });

  it('sin principal, usa el primer campo al que fue invitado', () => {
    const user = usuarioJwt({
      id_establecimiento: null,
      userEstablecimientos: [{ establecimientoId: 30 }],
    });
    expect(pasar({ user, query: {} }).id_establecimiento).toBe(30);
  });

  it('sin ningún campo, rechaza', () => {
    const user = usuarioJwt({
      id_establecimiento: null,
      userEstablecimientos: [],
    });
    expect(() => pasar({ user, query: {} })).toThrow(ForbiddenException);
  });

  it('sin usuario autenticado, 401', () => {
    expect(() => pasar({ query: {} })).toThrow(UnauthorizedException);
  });

  // El rol global 'admin' lo tiene cualquiera que se registra: no puede habilitar
  // ver datos de todos los campos.
  it('solo super_admin queda marcado como es_admin', () => {
    expect(
      pasar({ user: usuarioJwt({ rol: 'admin' }), query: {} }).es_admin,
    ).toBe(false);
    expect(
      pasar({ user: usuarioJwt({ rol: 'super_admin' }), query: {} }).es_admin,
    ).toBe(true);
  });

  it('con @SkipEstablecimientoCheck no valida nada', () => {
    const conSkip = new EstablecimientoGuard(reflectorCon(true));
    const request: Record<string, any> = {
      query: { id_establecimiento: '99' },
    };
    expect(conSkip.canActivate(contextoHttp(request))).toBe(true);
    expect(request.id_establecimiento).toBeUndefined();
  });

  it('el super_admin puede pedir cualquier campo', () => {
    const superAdmin = usuarioJwt({ rol: 'super_admin', id_establecimiento: 10, userEstablecimientos: [] });
    const request = pasar({ user: superAdmin, query: { id_establecimiento: '99' } });
    expect(request.id_establecimiento).toBe(99);
  });
});
