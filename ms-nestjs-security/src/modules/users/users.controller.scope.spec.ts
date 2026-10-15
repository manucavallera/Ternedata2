import { HttpException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserRole } from './entity/users.entity';

describe('UsersController alcance por campo', () => {
  const admin = { userId: 10, rol: UserRole.ADMIN, id_establecimiento: 1 };
  const superAdmin = { userId: 1, rol: UserRole.SUPER_ADMIN };
  const service: any = {
    create: jest.fn(),
    findByRole: jest.fn(),
    findByEstablecimiento: jest.fn(),
    findOne: jest.fn(),
    syncEstablecimientos: jest.fn(),
    verificarAlcance: jest.fn(),
    verificarEstablecimientos: jest.fn(),
    camposDe: jest.fn(),
    camposAdministrados: jest.fn(),
  };
  const denegado = new HttpException('No', 403);
  let controller: UsersController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new UsersController(service);
  });

  describe('POST /users', () => {
    it('exige campo a un admin', async () => {
      await expect(controller.create({ email: 'a@b.c' } as any, { user: admin })).rejects.toThrow(HttpException);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('rechaza un campo que el admin no administra', async () => {
      service.verificarEstablecimientos.mockRejectedValue(denegado);
      await expect(
        controller.create({ email: 'a@b.c', id_establecimiento: 99 } as any, { user: admin }),
      ).rejects.toBe(denegado);
      expect(service.verificarEstablecimientos).toHaveBeenCalledWith(admin, [99]);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('crea en un campo propio', async () => {
      const dto = { email: 'a@b.c', id_establecimiento: 1 } as any;
      await controller.create(dto, { user: admin });
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('super_admin puede crear sin campo', async () => {
      await controller.create({ email: 'a@b.c' } as any, { user: superAdmin });
      expect(service.create).toHaveBeenCalled();
    });
  });

  describe('GET /users/by-role/:role', () => {
    it('filtra por los campos del actor', async () => {
      service.camposDe.mockResolvedValue([1, 2]);
      await controller.findByRole(UserRole.OPERARIO, { user: admin });
      expect(service.findByRole).toHaveBeenCalledWith(UserRole.OPERARIO, [1, 2]);
    });

    it('super_admin ve todo', async () => {
      await controller.findByRole(UserRole.OPERARIO, { user: superAdmin });
      expect(service.findByRole).toHaveBeenCalledWith(UserRole.OPERARIO, null);
    });
  });

  describe('GET /users/by-establecimiento/:id', () => {
    it('rechaza un campo ajeno', async () => {
      service.verificarEstablecimientos.mockRejectedValue(denegado);
      await expect(controller.findByEstablecimiento(99, { user: admin })).rejects.toBe(denegado);
      expect(service.findByEstablecimiento).not.toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('rechaza un usuario de otro campo', async () => {
      service.verificarAlcance.mockRejectedValue(denegado);
      await expect(controller.findOne(50, { user: admin })).rejects.toBe(denegado);
      expect(service.findOne).not.toHaveBeenCalled();
    });

    it('oculta las membresías en campos ajenos', async () => {
      service.findOne.mockResolvedValue({
        id: 50,
        userEstablecimientos: [{ establecimientoId: 1 }, { establecimientoId: 7 }],
      });
      service.camposAdministrados.mockResolvedValue([1]);
      const user = await controller.findOne(50, { user: admin });
      expect(service.verificarAlcance).toHaveBeenCalledWith(admin, 50);
      expect(user.userEstablecimientos).toEqual([{ establecimientoId: 1 }]);
    });

    it('el propio usuario se ve sin chequeo de alcance', async () => {
      service.findOne.mockResolvedValue({ id: 10 });
      await controller.findOne(10, { user: admin });
      expect(service.verificarAlcance).not.toHaveBeenCalled();
    });
  });

  describe('PUT /users/:id/establecimientos', () => {
    it('solo reemplaza membresías en campos del actor', async () => {
      service.camposAdministrados.mockResolvedValue([1]);
      await controller.syncEstablecimientos(50, [1], { user: admin });
      expect(service.syncEstablecimientos).toHaveBeenCalledWith(50, [1], [1]);
    });
  });
});
