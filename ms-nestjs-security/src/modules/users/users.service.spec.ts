import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './entity/users.entity';

describe('UsersService global administration', () => {
  const usersRepository: any = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const assignmentsRepository: any = { find: jest.fn() };
  const establishmentsRepository: any = { findBy: jest.fn() };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      usersRepository,
      assignmentsRepository,
      establishmentsRepository,
    );
  });

  it('returns a safe global projection with assigned establishment names', async () => {
    usersRepository.find.mockResolvedValue([
      {
        id: 1,
        name: 'Manuel',
        email: 'manuel@example.com',
        rol: UserRole.SUPER_ADMIN,
        estado: 'activo',
        id_establecimiento: 10,
        establecimiento: { nombre: 'Campo Norte' },
        userEstablecimientos: [{ establecimientoId: 20 }],
        password: 'must-not-leak',
        password_reset_jti: 'secret',
      },
    ]);
    establishmentsRepository.findBy.mockResolvedValue([
      { id: 10, nombre: 'Campo Norte' },
      { id: 20, nombre: 'Campo Sur' },
    ]);

    const result = await service.findAllGlobal();

    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        establecimiento: 'Campo Norte',
        establecimientosAsignados: [
          { id: 10, nombre: 'Campo Norte' },
          { id: 20, nombre: 'Campo Sur' },
        ],
      }),
    ]);
    expect(result[0]).not.toHaveProperty('password');
    expect(result[0]).not.toHaveProperty('password_reset_jti');
  });

  it('rejects degrading the only active super-admin', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 1,
      rol: UserRole.SUPER_ADMIN,
      estado: 'activo',
    });
    usersRepository.count.mockResolvedValue(1);

    await expect(service.changeRole(1, UserRole.ADMIN)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('rejects deactivating the only active super-admin', async () => {
    usersRepository.findOne.mockResolvedValue({
      id: 1,
      rol: UserRole.SUPER_ADMIN,
      estado: 'activo',
    });
    usersRepository.count.mockResolvedValue(1);

    await expect(service.toggleStatus(1)).rejects.toBeInstanceOf(ConflictException);
    expect(usersRepository.update).not.toHaveBeenCalled();
  });
});

