import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService.verificarPertenenciaAdmin', () => {
  const usersRepository = { findOne: jest.fn() };
  const userEstRepo = { find: jest.fn() };
  const admin = {
    userId: 10,
    rol: 'admin',
    id_establecimiento: 1,
    userEstablecimientos: [{ establecimientoId: 1 }],
  };
  let service: UsersService;

  // user_establecimientos por usuario: el admin (10) pertenece al 1 y al 2
  const asignaciones = (porUsuario: Record<number, number[]>) =>
    userEstRepo.find.mockImplementation(({ where }) =>
      Promise.resolve(
        (porUsuario[where.userId] || []).map((establecimientoId) => ({
          establecimientoId,
        })),
      ),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(usersRepository as any, userEstRepo as any);
    asignaciones({ 10: [1, 2] });
  });

  it('permite operar sobre un usuario de un establecimiento del admin', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 1 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).resolves.toBeUndefined();
  });

  it('permite si el establecimiento se asignó al admin después de emitido el token', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 2 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).resolves.toBeUndefined();
  });

  it('rechaza a un usuario de otro establecimiento', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: 99 });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza a un usuario sin ningún establecimiento', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('permite a un usuario sin principal que es miembro de un establecimiento del admin', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });
    asignaciones({ 10: [1, 2], 20: [2] });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).resolves.toBeUndefined();
  });

  it('rechaza a un usuario sin principal que es miembro solo de establecimientos ajenos', async () => {
    usersRepository.findOne.mockResolvedValue({ id: 20, id_establecimiento: null });
    asignaciones({ 10: [1, 2], 20: [99] });

    await expect(service.verificarPertenenciaAdmin(admin, 20)).rejects.toThrow(ForbiddenException);
  });

  it('super_admin opera sobre cualquiera', async () => {
    await expect(
      service.verificarPertenenciaAdmin({ userId: 1, rol: 'super_admin' }, 20),
    ).resolves.toBeUndefined();
    expect(usersRepository.findOne).not.toHaveBeenCalled();
  });
});
