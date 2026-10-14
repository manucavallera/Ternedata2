import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: jest.fn().mockResolvedValue({}) }),
}));

const statusDe = async (promesa: Promise<unknown>) => {
  try {
    await promesa;
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : error;
  }
  throw new Error('Se esperaba un error');
};

describe('AuthService (security)', () => {
  const jwt = new JwtService({ secret: 'secreto-de-test' });
  let users: Record<string, jest.Mock>;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await hash('Clave1234', 4);
  });

  const usuario = (datos: Record<string, any> = {}) => ({
    id: 7,
    name: 'Ana',
    email: 'ana@campo.com',
    password: passwordHash,
    rol: 'admin',
    estado: 'activo',
    email_verificado: true,
    id_establecimiento: 10,
    userEstablecimientos: [],
    ...datos,
  });

  beforeEach(() => {
    users = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (u) => ({ id: 7, ...u })),
      update: jest.fn(),
    };
    service = new AuthService(users as any, {} as any, jwt);
    jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
  });

  describe('registro', () => {
    it('sin invitación queda admin, sin campo y sin verificar; la contraseña se guarda hasheada', async () => {
      await service.register({
        name: 'Ana',
        email: 'ana@campo.com',
        password: 'Clave1234',
      } as any);
      const guardado = users.save.mock.calls[0][0];
      expect(guardado).toMatchObject({
        rol: 'admin',
        id_establecimiento: null,
        email_verificado: false,
      });
      expect(guardado.password).not.toBe('Clave1234');
    });

    it('con invitación queda operario', async () => {
      await service.register({
        name: 'Ana',
        email: 'ana@campo.com',
        password: 'Clave1234',
        invitationToken: 't',
      } as any);
      expect(users.save.mock.calls[0][0].rol).toBe('operario');
    });

    it('email o teléfono repetidos, 409', async () => {
      users.findOne.mockResolvedValueOnce(usuario());
      expect(
        await statusDe(
          service.register({
            name: 'A',
            email: 'ana@campo.com',
            password: 'x',
          } as any),
        ),
      ).toBe(HttpStatus.CONFLICT);
      users.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(usuario());
      expect(
        await statusDe(
          service.register({
            name: 'A',
            email: 'otra@campo.com',
            password: 'x',
            telefono: '11',
          } as any),
        ),
      ).toBe(HttpStatus.CONFLICT);
    });

    it('faltan datos, 400', async () => {
      expect(
        await statusDe(service.register({ email: 'ana@campo.com' } as any)),
      ).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('login', () => {
    it('devuelve un token de sesión con id, rol y campos, que vence en 7 días', async () => {
      users.findOne.mockResolvedValue(
        usuario({
          userEstablecimientos: [{ establecimientoId: 20, rol: 'operario' }],
        }),
      );
      const { token } = await service.login({
        email: 'ana@campo.com',
        password: 'Clave1234',
      });
      const payload = jwt.verify(token);
      expect(payload).toMatchObject({
        id: 7,
        rol: 'admin',
        id_establecimiento: 10,
      });
      expect(payload.type).toBeUndefined();
      expect(payload.exp - payload.iat).toBe(7 * 24 * 3600);
    });

    it.each([
      ['usuario inexistente', null, 'Clave1234', HttpStatus.UNAUTHORIZED],
      ['contraseña incorrecta', {}, 'otra', HttpStatus.UNAUTHORIZED],
      [
        'usuario inactivo',
        { estado: 'inactivo' },
        'Clave1234',
        HttpStatus.FORBIDDEN,
      ],
      [
        'email sin verificar',
        { email_verificado: false },
        'Clave1234',
        HttpStatus.FORBIDDEN,
      ],
    ])('%s', async (_caso, datos, password, status) => {
      users.findOne.mockResolvedValue(datos === null ? null : usuario(datos));
      expect(
        await statusDe(service.login({ email: 'ana@campo.com', password })),
      ).toBe(status);
    });
  });

  describe('verificación de email', () => {
    it('marca el email como verificado', async () => {
      users.findOne.mockResolvedValue(usuario({ email_verificado: false }));
      await service.verifyEmail(
        jwt.sign({ id: 7, email: 'ana@campo.com', type: 'verify' }),
      );
      expect(users.update).toHaveBeenCalledWith(7, { email_verificado: true });
    });

    it('rechaza un token de sesión o uno inválido', async () => {
      expect(
        await statusDe(service.verifyEmail(jwt.sign({ id: 7, rol: 'admin' }))),
      ).toBe(HttpStatus.BAD_REQUEST);
      expect(await statusDe(service.verifyEmail('no-es-un-jwt'))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('recuperar contraseña', () => {
    it('no revela si el email existe', async () => {
      const inexistente = await service.forgotPassword('nadie@campo.com');
      users.findOne.mockResolvedValue(usuario());
      const existente = await service.forgotPassword('ana@campo.com');
      expect(inexistente).toEqual(existente);
    });

    it('el token de reset sirve una sola vez', async () => {
      const token = jwt.sign({
        id: 7,
        email: 'ana@campo.com',
        type: 'reset',
        jti: 'abc',
      });
      users.findOne.mockResolvedValue(usuario({ password_reset_jti: 'abc' }));
      await service.resetPassword(token, 'Nueva1234');
      expect(users.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ password_reset_jti: null }),
      );
      users.findOne.mockResolvedValue(usuario({ password_reset_jti: null }));
      expect(await statusDe(service.resetPassword(token, 'Otra1234'))).toBe(
        HttpStatus.BAD_REQUEST,
      );
    });

    it('no acepta un token de sesión como token de reset', async () => {
      users.findOne.mockResolvedValue(usuario());
      expect(
        await statusDe(
          service.resetPassword(jwt.sign({ id: 7, rol: 'admin' }), 'Nueva1234'),
        ),
      ).toBe(HttpStatus.BAD_REQUEST);
      expect(users.update).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('un usuario desactivado no renueva la sesión', async () => {
      users.findOne.mockResolvedValue(usuario({ estado: 'inactivo' }));
      expect(await statusDe(service.refreshToken(7))).toBe(
        HttpStatus.FORBIDDEN,
      );
    });
  });

  // Endpoint /auth/generar-token: firmaba tokens con el rol que pidiera cualquier admin.
  it('ya no existe el generador de tokens con rol a pedido', () => {
    expect((service as any).crearTokenMagico).toBeUndefined();
  });
});
