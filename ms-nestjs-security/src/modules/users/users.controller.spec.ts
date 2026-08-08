import { Reflector } from '@nestjs/core';
import { UsersController } from './users.controller';
import { UserRole } from './entity/users.entity';
import { ROLES_KEY } from '../auth/roles.decorator';

describe('UsersController global administration', () => {
  const service: any = {
    findAllGlobal: jest.fn(),
    changeRole: jest.fn(),
    toggleStatus: jest.fn(),
    getEstablecimientos: jest.fn(),
  };
  let controller: UsersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(service);
  });

  it('marks every global route as super-admin-only', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAllGlobal)).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.changeRole)).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.toggleStatus)).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.getEstablecimientos)).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
  });

  it('forwards the validated role payload to the service', async () => {
    service.changeRole.mockResolvedValue({ id: 4, rol: UserRole.VETERINARIO });
    await controller.changeRole(4, { rol: UserRole.VETERINARIO });
    expect(service.changeRole).toHaveBeenCalledWith(4, UserRole.VETERINARIO);
  });
});

