import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UserRole, UserStatus } from '../users/entity/users.entity';

describe('JwtStrategy current user validation', () => {
  const configService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const usersRepository = {
    findOne: jest.fn(),
  };

  const createStrategy = () =>
    new (JwtStrategy as any)(configService, usersRepository);

  beforeEach(() => {
    usersRepository.findOne.mockReset();
  });

  it('rechaza un JWT válido cuando la cuenta fue desactivada', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 7,
      estado: UserStatus.INACTIVO,
    });

    await expect(createStrategy().validate({ id: 7 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('usa rol y establecimientos actuales de una cuenta activa', async () => {
    const assignments = [{ id_establecimiento: 12 }];
    usersRepository.findOne.mockResolvedValue({
      id: 7,
      name: 'Usuario actual',
      rol: UserRole.VETERINARIO,
      estado: UserStatus.ACTIVO,
      id_establecimiento: 4,
      userEstablecimientos: assignments,
    });

    await expect(
      createStrategy().validate({
        id: 7,
        name: 'Nombre viejo',
        rol: UserRole.OPERARIO,
        id_establecimiento: 1,
        userEstablecimientos: [],
      }),
    ).resolves.toEqual({
      userId: 7,
      id: 7,
      username: 'Usuario actual',
      rol: UserRole.VETERINARIO,
      id_establecimiento: 4,
      userEstablecimientos: assignments,
    });

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 7 },
      relations: ['userEstablecimientos'],
    });
  });
});
