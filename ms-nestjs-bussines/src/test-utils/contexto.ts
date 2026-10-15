import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// ExecutionContext mínimo para probar guards sin levantar Nest: solo expone el
// request HTTP y un handler y una clase sobre los que el Reflector lee metadata.
export const contextoHttp = (request: Record<string, any>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

// Reflector que devuelve siempre la metadata indicada (roles, skip, etc.).
export const reflectorCon = (valor: unknown): Reflector =>
  ({
    getAllAndOverride: jest.fn().mockReturnValue(valor),
  }) as unknown as Reflector;

// Usuario tal como lo deja JwtStrategy en request.user.
export const usuarioJwt = (datos: Record<string, any> = {}) => ({
  userId: 1,
  username: 'Usuario',
  rol: 'admin',
  id_establecimiento: 10,
  userEstablecimientos: [],
  ...datos,
});
