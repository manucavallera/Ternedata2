import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from './roles.enum';
import { Logger } from '@nestjs/common';

describe('InvitacionesService', () => {
  const invitationRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const userEstablecimientoRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const usersService = {
    findOne: jest.fn(),
    assignEstablecimiento: jest.fn(),
  };
  const mailService = {
    sendMail: jest.fn(),
  };

  const service = new InvitacionesService(
    invitationRepo as any,
    userEstablecimientoRepo as any,
    usersService as any,
    mailService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    process.env.FRONTEND_URL = 'https://app.ternedata.test';
    invitationRepo.findOne.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('conserva el link pero informa fallo cuando Mailer rechaza', async () => {
    mailService.sendMail.mockRejectedValue(new Error('SMTP down'));

    const result = await service.generarLink(
      4,
      RolEstablecimiento.OPERARIO,
      'persona@example.com',
    );

    expect(result.emailEnviado).toBeNull();
    expect(result.emailError).toBe('No se pudo enviar el correo');
    expect(result.link).toContain(
      'https://app.ternedata.test/join?token=',
    );
    expect(result.link).toContain('email=persona%40example.com');
  });

  it('rechaza una invitación dirigida cuando el email no coincide', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 10,
      token: 'invite-1',
      email: 'destino@example.com',
      usado: false,
      expiracion: new Date(Date.now() + 60_000),
      establecimientoId: 4,
      rol: RolEstablecimiento.OPERARIO,
    });
    usersService.findOne.mockResolvedValue({ email: 'otro@example.com' });

    await expect(service.aceptarLink('invite-1', 8)).rejects.toMatchObject({
      status: 403,
    });
    expect(userEstablecimientoRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza un token expirado sin crear membresía', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 10,
      token: 'invite-1',
      email: null,
      usado: false,
      expiracion: new Date(Date.now() - 60_000),
      establecimientoId: 4,
      rol: RolEstablecimiento.OPERARIO,
    });

    await expect(service.aceptarLink('invite-1', 8)).rejects.toMatchObject({
      status: 400,
    });
    expect(userEstablecimientoRepo.save).not.toHaveBeenCalled();
  });

  it('marca usada la invitación cuando el usuario ya es miembro', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 10,
      token: 'invite-1',
      email: null,
      usado: false,
      expiracion: new Date(Date.now() + 60_000),
      establecimientoId: 4,
      rol: RolEstablecimiento.OPERARIO,
    });
    userEstablecimientoRepo.findOne.mockResolvedValue({ userId: 8 });

    await expect(service.aceptarLink('invite-1', 8)).rejects.toMatchObject({
      status: 409,
    });
    expect(invitationRepo.update).toHaveBeenCalledWith(10, { usado: true });
    expect(userEstablecimientoRepo.save).not.toHaveBeenCalled();
  });

  it('crea una sola membresía y consume una invitación válida', async () => {
    invitationRepo.findOne.mockResolvedValue({
      id: 10,
      token: 'invite-1',
      email: null,
      usado: false,
      expiracion: new Date(Date.now() + 60_000),
      establecimientoId: 4,
      rol: RolEstablecimiento.VETERINARIO,
    });
    userEstablecimientoRepo.findOne.mockResolvedValue(null);

    await expect(service.aceptarLink('invite-1', 8)).resolves.toEqual({
      message: '¡Te has unido al equipo exitosamente!',
      establecimientoId: 4,
    });
    expect(userEstablecimientoRepo.save).toHaveBeenCalledTimes(1);
    expect(userEstablecimientoRepo.save).toHaveBeenCalledWith({
      userId: 8,
      establecimientoId: 4,
      rol: RolEstablecimiento.VETERINARIO,
    });
    expect(invitationRepo.update).toHaveBeenCalledWith(10, { usado: true });
    expect(usersService.assignEstablecimiento).toHaveBeenCalledWith(8, 4);
  });
});
