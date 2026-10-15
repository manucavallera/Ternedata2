import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from './roles.enum';
import { repositorioFalso, statusDe } from 'src/test-utils/repositorio';

// Invitaciones: la puerta de entrada a un campo ajeno. Las reglas protegen que
// solo entre quien fue invitado, una sola vez y antes de que venza el link.
const HOY = new Date('2026-10-14T12:00:00Z');
const CAMPO = 10;

const invitacion = (datos: Record<string, any> = {}) => ({
  id: 1,
  token: 'tok-123',
  establecimientoId: CAMPO,
  rol: RolEstablecimiento.OPERARIO,
  email: 'peon@campo.com',
  usado: false,
  expiracion: new Date('2026-10-15T12:00:00Z'),
  ...datos,
});

describe('InvitacionesService', () => {
  let invitaciones: ReturnType<typeof repositorioFalso>;
  let membresias: ReturnType<typeof repositorioFalso>;
  let usersService: { findOne: jest.Mock; assignEstablecimiento: jest.Mock };
  let mail: { sendMail: jest.Mock };
  let rolEstablecimiento: { exigirAdminDe: jest.Mock };
  let service: InvitacionesService;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOY);
    process.env.FRONTEND_URL = 'https://app.ternedata.test';
  });
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    invitaciones = repositorioFalso();
    membresias = repositorioFalso();
    usersService = {
      findOne: jest.fn().mockResolvedValue({ id: 50, email: 'peon@campo.com' }),
      assignEstablecimiento: jest.fn(),
    };
    mail = { sendMail: jest.fn() };
    rolEstablecimiento = { exigirAdminDe: jest.fn() };
    service = new InvitacionesService(
      invitaciones as any,
      membresias as any,
      usersService as any,
      mail as any,
      rolEstablecimiento as any,
    );
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  describe('generar', () => {
    it('crea un token que vence a las 48 h y manda el mail con el link', async () => {
      const res = await service.generarLink(
        CAMPO,
        RolEstablecimiento.OPERARIO,
        'peon@campo.com',
      );
      expect(invitaciones.save).toHaveBeenCalledWith(
        expect.objectContaining({
          establecimientoId: CAMPO,
          rol: 'operario',
          email: 'peon@campo.com',
          expiracion: new Date('2026-10-16T12:00:00Z'),
        }),
      );
      expect(mail.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'peon@campo.com' }),
      );
      expect(res.link).toBe(
        `https://app.ternedata.test/join?token=${res.token}&email=peon%40campo.com`,
      );
    });

    it('no duplica una invitación pendiente para el mismo email y campo', async () => {
      invitaciones.findOne.mockResolvedValue(invitacion());
      await expect(
        service.generarLink(
          CAMPO,
          RolEstablecimiento.OPERARIO,
          'peon@campo.com',
        ),
      ).rejects.toThrow(ConflictException);
    });

    // Antes "Peon@Campo.com" y "peon@campo.com" eran invitaciones distintas y la
    // aceptación automática al loguearse no las encontraba.
    it('guarda el email normalizado', async () => {
      await service.generarLink(
        CAMPO,
        RolEstablecimiento.OPERARIO,
        '  Peon@Campo.COM ',
      );
      expect(invitaciones.findOne).toHaveBeenCalledWith({
        where: {
          email: 'peon@campo.com',
          establecimientoId: CAMPO,
          usado: false,
        },
      });
      expect(invitaciones.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'peon@campo.com' }),
      );
    });

    it('si el mail falla, la invitación igual queda creada', async () => {
      mail.sendMail.mockRejectedValue(new Error('SMTP caído'));
      await expect(
        service.generarLink(
          CAMPO,
          RolEstablecimiento.OPERARIO,
          'peon@campo.com',
        ),
      ).resolves.toHaveProperty('token');
    });
    // Un link sin email lo puede usar cualquiera que lo tenga
    it('no genera un link de dueño sin email', async () => {
      await expect(
        service.generarLink(CAMPO, RolEstablecimiento.DUENO),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
      await expect(
        service.generarLink(CAMPO, RolEstablecimiento.DUENO, '   '),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
      expect(invitaciones.save).not.toHaveBeenCalled();
    });

    it('invita a un dueño con email y genera links sin email para operarios', async () => {
      await service.generarLink(CAMPO, RolEstablecimiento.DUENO, 'dueno@campo.com');
      await service.generarLink(CAMPO, RolEstablecimiento.OPERARIO);
      expect(invitaciones.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('aceptar con link', () => {
    it('suma al usuario al campo con el rol de la invitación y la cierra', async () => {
      invitaciones.findOne.mockResolvedValue(invitacion());
      await service.aceptarLink('tok-123', 50);
      expect(membresias.save).toHaveBeenCalledWith({
        userId: 50,
        establecimientoId: CAMPO,
        rol: 'operario',
      });
      expect(invitaciones.update).toHaveBeenCalledWith(1, { usado: true });
      expect(usersService.assignEstablecimiento).toHaveBeenCalledWith(
        50,
        CAMPO,
      );
    });

    it('link inexistente o usado, 400', async () => {
      expect(await statusDe(service.aceptarLink('nada', 50))).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(invitaciones.findOne).toHaveBeenCalledWith({
        where: { token: 'nada', usado: false },
      });
    });

    it('link vencido, 400', async () => {
      invitaciones.findOne.mockResolvedValue(
        invitacion({ expiracion: new Date('2026-10-13T00:00:00Z') }),
      );
      expect(await statusDe(service.aceptarLink('tok-123', 50))).toBe(
        HttpStatus.BAD_REQUEST,
      );
      expect(membresias.save).not.toHaveBeenCalled();
    });

    it('una invitación dirigida solo la acepta ese email (sin importar mayúsculas)', async () => {
      invitaciones.findOne.mockResolvedValue(
        invitacion({ email: 'Peon@Campo.com' }),
      );
      usersService.findOne.mockResolvedValue({
        id: 51,
        email: 'otro@campo.com',
      });
      expect(await statusDe(service.aceptarLink('tok-123', 51))).toBe(
        HttpStatus.FORBIDDEN,
      );
      usersService.findOne.mockResolvedValue({
        id: 50,
        email: 'peon@campo.com',
      });
      await expect(service.aceptarLink('tok-123', 50)).resolves.toHaveProperty(
        'establecimientoId',
        CAMPO,
      );
    });

    it('un link sin email lo puede aceptar cualquiera con sesión', async () => {
      invitaciones.findOne.mockResolvedValue(invitacion({ email: null }));
      await service.aceptarLink('tok-123', 77);
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(membresias.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 77 }),
      );
    });

    it('si ya es miembro, 409 y la invitación queda usada', async () => {
      invitaciones.findOne.mockResolvedValue(invitacion());
      membresias.findOne.mockResolvedValue({
        userId: 50,
        establecimientoId: CAMPO,
      });
      expect(await statusDe(service.aceptarLink('tok-123', 50))).toBe(
        HttpStatus.CONFLICT,
      );
      expect(invitaciones.update).toHaveBeenCalledWith(1, { usado: true });
      expect(membresias.save).not.toHaveBeenCalled();
    });
  });

  describe('aceptar automáticamente al loguearse', () => {
    it('acepta las vigentes y saltea las vencidas', async () => {
      invitaciones.find.mockResolvedValue([
        invitacion({ id: 1, establecimientoId: 10 }),
        invitacion({
          id: 2,
          establecimientoId: 20,
          expiracion: new Date('2026-10-01T00:00:00Z'),
        }),
      ]);
      expect(await service.aceptarPorEmail(50)).toEqual({ aceptadas: 1 });
      expect(membresias.save).toHaveBeenCalledTimes(1);
      expect(membresias.save).toHaveBeenCalledWith({
        userId: 50,
        establecimientoId: 10,
        rol: 'operario',
      });
    });

    it('busca las invitaciones sin distinguir mayúsculas del email', async () => {
      usersService.findOne.mockResolvedValue({
        id: 50,
        email: 'Peon@Campo.com',
      });
      await service.aceptarPorEmail(50);
      const [{ where }] = invitaciones.find.mock.calls[0];
      expect(where.usado).toBe(false);
      // Raw(LOWER(email) = :email) con el email en minúscula
      expect(where.email.getSql('email')).toBe('LOWER(email) = :email');
      expect(where.email.objectLiteralParameters).toEqual({
        email: 'peon@campo.com',
      });
    });

    it('usuario sin email, no acepta nada', async () => {
      usersService.findOne.mockResolvedValue({ id: 50 });
      expect(await service.aceptarPorEmail(50)).toEqual({ aceptadas: 0 });
      expect(invitaciones.find).not.toHaveBeenCalled();
    });
  });

  describe('revocar', () => {
    it('solo un admin del campo de la invitación', async () => {
      invitaciones.findOne.mockResolvedValue(invitacion());
      rolEstablecimiento.exigirAdminDe.mockRejectedValue(
        new ForbiddenException(),
      );
      await expect(service.revocar(1, { userId: 9 })).rejects.toThrow(
        ForbiddenException,
      );
      expect(rolEstablecimiento.exigirAdminDe).toHaveBeenCalledWith(
        { userId: 9 },
        CAMPO,
      );
      expect(invitaciones.remove).not.toHaveBeenCalled();
    });

    it('inexistente, 404', async () => {
      expect(await statusDe(service.revocar(1, { userId: 9 }))).toBe(
        HttpStatus.NOT_FOUND,
      );
    });
  });
});
