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

  const createRegistrationService = () => {
    const usersRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (user) => ({ id: 8, ...user })),
    };
    const service = new AuthService(
      usersRepository as any,
      {} as any,
      { sign: jest.fn().mockReturnValue('verify-jwt') } as any,
    );
    jest
      .spyOn(service as any, 'enviarMailVerificacion')
      .mockResolvedValue(undefined);
    return { service, usersRepository };
  };

  it('registro invitado crea operario no verificado y pide verificar email', async () => {
    const { service, usersRepository } = createRegistrationService();

    const result = await service.register({
      name: 'Persona Invitada',
      email: 'invitada@example.com',
      password: 'clave123',
      invitationToken: 'invite-1',
      platform: 'web',
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        rol: 'operario',
        email_verificado: false,
        id_establecimiento: null,
      }),
    );
    expect(result.message).toContain('verificar tu cuenta');
    expect(result.message.toLowerCase()).not.toContain('activación exitosa');
  });

  it('registro normal conserva admin no verificado', async () => {
    const { service, usersRepository } = createRegistrationService();

    await service.register({
      name: 'Persona Administradora',
      email: 'admin@example.com',
      password: 'clave123',
      platform: 'web',
    });

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ rol: 'admin', email_verificado: false }),
    );
  });
});
