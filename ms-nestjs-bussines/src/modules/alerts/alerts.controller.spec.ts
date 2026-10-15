import { ForbiddenException } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

describe('AlertsController', () => {
  const findOne = jest.fn();
  const repo: any = {
    findOne,
    create: jest.fn((x) => x),
    merge: jest.fn((a, b) => Object.assign(a, b)),
    save: jest.fn((x) => x),
  };
  const service = new AlertsService(repo, {} as any);
  const controller = new AlertsController(service);
  const ana = { user: { userId: 7, rol: 'admin' } };

  beforeEach(() => {
    jest.clearAllMocks();
    findOne.mockResolvedValue(null);
  });

  it('rechaza leer las alertas de otro usuario', async () => {
    await expect(controller.getConfig(8, ana)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rechaza cambiar las alertas de otro usuario', async () => {
    await expect(
      controller.saveConfig(8, { emailEnabled: false }, ana),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('super_admin puede leer las de cualquiera', async () => {
    await expect(
      controller.getConfig(8, { user: { userId: 1, rol: 'super_admin' } }),
    ).resolves.toMatchObject({ userId: 8 });
  });

  it('guarda solo los campos configurables', async () => {
    const guardado = await controller.saveConfig(
      7,
      { emailEnabled: false, userId: 99, lastAlertSent: null, id: 3 },
      ana,
    );
    expect(guardado).toEqual({ userId: 7, emailEnabled: false });
  });
});
