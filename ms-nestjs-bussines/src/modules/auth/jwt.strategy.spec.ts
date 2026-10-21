import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

// Business y security comparten JWT_SECRET, y con ese secreto también se firman los
// tokens de verificación de email y de reset de contraseña. La estrategia solo debe
// aceptar tokens de sesión: con id de usuario y sin "type".
describe('JwtStrategy', () => {
  const findOne = jest.fn();
  const query = jest.fn();
  const dataSource: any = { getRepository: () => ({ findOne }), query };
  const strategy = new JwtStrategy(
    { get: () => 'secreto-de-test' } as unknown as ConfigService,
    dataSource,
  );

  beforeEach(() => {
    findOne.mockReset();
    findOne.mockResolvedValue({ id: 7, rol: 'admin', estado: 'activo', id_establecimiento: 10 });
    query.mockReset();
    query.mockResolvedValue([{ establecimientoId: 20, rol: 'operario' }]);
  });

  const sesion = {
    id: 7,
    name: 'Ana',
    rol: 'admin',
    id_establecimiento: 10,
    userEstablecimientos: [{ establecimientoId: 20, rol: 'operario' }],
  };

  it('acepta un token de sesión y arma request.user', async () => {
    await expect(strategy.validate(sesion)).resolves.toMatchObject({
      userId: 7,
      rol: 'admin',
      id_establecimiento: 10,
      userEstablecimientos: [{ establecimientoId: 20, rol: 'operario' }],
    });
  });

  // El token de /auth/generar-token no tenía id: con rol super_admin pasaba todos
  // los guards y veía los datos de cualquier campo.
  it('rechaza un token sin id de usuario', async () => {
    await expect(
      strategy.validate({
        email: 'x@x.com',
        rol: 'super_admin',
        id_establecimiento: 64,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it.each(['verify', 'reset'])(
    'rechaza un token de tipo "%s"',
    async (type) => {
      await expect(
        strategy.validate({ id: 7, email: 'ana@campo.com', type }),
      ).rejects.toThrow(UnauthorizedException);
    },
  );

  it('rechaza el token de un usuario desactivado', async () => {
    findOne.mockResolvedValue({ id: 7, rol: 'admin', estado: 'inactivo' });
    await expect(strategy.validate(sesion)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza el token de un usuario que ya no existe', async () => {
    findOne.mockResolvedValue(null);
    await expect(strategy.validate(sesion)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('toma el rol de la base y no el del token', async () => {
    findOne.mockResolvedValue({ id: 7, rol: 'operario', estado: 'activo' });
    await expect(strategy.validate(sesion)).resolves.toMatchObject({
      rol: 'operario',
    });
  });

  // Sacar a alguien de un campo o cambiarle el rol tiene que valer con el token ya emitido.
  it('toma las membresías y el campo principal de la base y no del token', async () => {
    findOne.mockResolvedValue({ id: 7, rol: 'admin', estado: 'activo', id_establecimiento: null });
    query.mockResolvedValue([{ establecimientoId: 20, rol: 'veterinario' }]);
    await expect(strategy.validate(sesion)).resolves.toMatchObject({
      id_establecimiento: null,
      userEstablecimientos: [{ establecimientoId: 20, rol: 'veterinario' }],
    });
  });

  it('un usuario sacado de todos sus campos queda sin membresías', async () => {
    query.mockResolvedValue([]);
    const user = await strategy.validate(sesion);
    expect(user.userEstablecimientos).toEqual([]);
  });
});
