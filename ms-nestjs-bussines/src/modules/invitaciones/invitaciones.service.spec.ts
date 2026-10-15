import { HttpException } from '@nestjs/common';
import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from './roles.enum';

describe('InvitacionesService.generarLink', () => {
  const invitacionRepo: any = {
    findOne: jest.fn(),
    create: jest.fn((x) => x),
    save: jest.fn(),
  };
  const mailService: any = { sendMail: jest.fn() };
  let service: InvitacionesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvitacionesService(
      invitacionRepo,
      {} as any,
      {} as any,
      mailService,
      {} as any,
    );
  });

  it('rechaza un link de dueño sin email', async () => {
    await expect(service.generarLink(1, RolEstablecimiento.DUENO)).rejects.toThrow(
      HttpException,
    );
    expect(invitacionRepo.save).not.toHaveBeenCalled();
  });

  it('acepta invitar a un dueño con email', async () => {
    invitacionRepo.findOne.mockResolvedValue(null);
    const res = await service.generarLink(1, RolEstablecimiento.DUENO, 'a@b.c');
    expect(res.emailEnviado).toBe('a@b.c');
    expect(invitacionRepo.save).toHaveBeenCalled();
  });

  it('permite un link sin email para operario', async () => {
    await service.generarLink(1, RolEstablecimiento.OPERARIO);
    expect(invitacionRepo.save).toHaveBeenCalled();
  });
});
