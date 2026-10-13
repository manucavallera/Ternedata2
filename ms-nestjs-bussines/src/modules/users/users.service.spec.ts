import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService.verificarPertenenciaAdmin', () => {
  const usersRepository = { findOne: jest.fn() };
  const userEstRepo = { find: jest.fn() };
  // El actor administra los establecimientos 1 y 2, y es operario en el 3.
  const rolEstablecimiento = {
    rolEn: jest.fn(async (_user: any, id: number) =>
      [1, 2].includes(id) ? 'admin' : id === 3 ? 'operario' : null,
    ),
  };
  const admin = { userId: 10, rol: 'admin', id_establecimiento: 1 };
  let service: UsersService;

  // Membresías del usuario sobre el que se opera cuando no tiene establecimiento principal.
  const membresiasDelUsuario = (ids: number[]) =>
    userEstRepo.find.mockResolvedValue(ids.map((establecimientoId) => ({ establecimientoId })));

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(
      usersRepository as any,
      userEstRepo as any,
      rolEstablecimiento as any,
    );
    membresiasDelUsuario([]);
  });

  it('permite operar sobre un usuario de un establecimiento que el actor administra', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 2 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).resolves.toBeUndefined();
  });

  it('rechaza si el actor solo es operario en el establecimiento del usuario', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 3 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza a un usuario de otro establecimiento', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 99 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza a un usuario sin ningún establecimiento', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('permite a un usuario sin principal que es miembro de un establecimiento que el actor administra', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });
    membresiasDelUsuario([99, 2]);

    await expect(service.verificarPertenenciaAdmin(admin, 20)).resolves.toBeUndefined();
  });

  it('rechaza a un usuario sin principal que es miembro solo de establecimientos ajenos', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });
    membresiasDelUsuario([99]);

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza operar sobre un super_admin aunque comparta establecimiento', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, rol: 'super_admin', id_establecimiento: 1 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('super_admin opera sobre cualquiera', async () => {
    await expect(
      service.verificarPertenenciaAdmin({ userId: 1, rol: 'super_admin' }, 20),
    ).resolves.toBeUndefined();
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });
});
