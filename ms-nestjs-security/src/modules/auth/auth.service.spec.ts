import { hash } from 'bcrypt';

import { AuthService } from './auth.service';

describe('AuthService public session contract', () => {
  const createService = (user: Record<string, unknown>) => {
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('jwt-fresco'),
    };
    const service = new AuthService(
      usersRepository as any,
      {} as any,
      jwtService as any,
    );
    return { service, jwtService };
  };

  const expectPublicUser = (user: Record<string, unknown>) => {
    expect(user).toEqual({
      id: 5,
      name: 'Manuel',
      email: 'self@example.com',
      rol: 'super_admin',
      estado: 'activo',
      telefono: '123',
      id_establecimiento: 7,
      email_verificado: true,
      userEstablecimientos: [{ establecimientoId: 7 }],
    });
    expect(user).not.toHaveProperty('password');
    expect(user).not.toHaveProperty('password_reset_jti');
  };

  it('login no devuelve hashes ni tokens de recuperación', async () => {
    const password = await hash('secreto-seguro', 4);
    const { service } = createService({
      id: 5,
      name: 'Manuel',
      email: 'self@example.com',
      password,
      password_reset_jti: 'reset-jti-secreto',
      rol: 'super_admin',
      estado: 'activo',
      telefono: '123',
      id_establecimiento: 7,
      email_verificado: true,
      userEstablecimientos: [{ establecimientoId: 7 }],
    });

    const result = await service.login({
      email: 'self@example.com',
      password: 'secreto-seguro',
    });

    expectPublicUser(result.user as unknown as Record<string, unknown>);
  });

  it('refresh no devuelve hashes ni tokens de recuperación', async () => {
    const { service } = createService({
      id: 5,
      name: 'Manuel',
      email: 'self@example.com',
      password: 'hash-secreto',
      password_reset_jti: 'reset-jti-secreto',
      rol: 'super_admin',
      estado: 'activo',
      telefono: '123',
      id_establecimiento: 7,
      email_verificado: true,
      userEstablecimientos: [{ establecimientoId: 7 }],
    });

    const result = await service.refreshToken(5);

    expectPublicUser(result.user as unknown as Record<string, unknown>);
  });
});
