import { ForbiddenException } from '@nestjs/common';
import { RolEstablecimientoService } from './rol-establecimiento.service';

describe('RolEstablecimientoService', () => {
  // Estado de la base simulada: membresías por usuario y campos con dueño registrado.
  let membresias: Record<string, string | null>;
  let conDueno: number[];
  const dataSource = {
    query: jest.fn(async (sql: string, [a, b]: number[]) => {
      if (sql.includes(`rol = 'dueno'`)) return conDueno.includes(a) ? [{}] : [];
      const rol = membresias[`${a}:${b}`];
      return rol === undefined ? [] : [{ rol }];
    }),
  };
  const service = new RolEstablecimientoService(dataSource as any);
  const usuario = (rol: string, filas: Record<number, string | null> = {}, principal: number | null = null) => ({
    userId: 7,
    rol,
    id_establecimiento: principal,
    userEstablecimientos: Object.entries(filas).map(([id, r]) => ({ establecimientoId: Number(id), rol: r })),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    membresias = {};
    conDueno = [];
  });

  it('el dueño es admin de su campo', async () => {
    await expect(service.rolEn(usuario('admin', { 1: 'dueno' }), 1)).resolves.toBe('admin');
  });

  it('quien se registró solo y fue invitado como operario es operario en ese campo', async () => {
    conDueno = [2];
    const user = usuario('admin', { 1: 'dueno', 2: 'operario' });

    await expect(service.rolEn(user, 2)).resolves.toBe('operario');
    await expect(service.rolEn(user, 1)).resolves.toBe('admin');
  });

  it('en un campo viejo sin dueño registrado, el admin global que pertenece sigue siendo admin', async () => {
    await expect(service.rolEn(usuario('admin', { 3: 'operario' }), 3)).resolves.toBe('admin');
  });

  it('un admin asignado solo como establecimiento principal conserva su rol', async () => {
    conDueno = [4];
    await expect(service.rolEn(usuario('admin', {}, 4), 4)).resolves.toBe('admin');
  });

  it('un invitado como veterinario lo es solo en ese campo', async () => {
    const user = usuario('operario', { 1: 'veterinario', 2: 'operario' });

    await expect(service.rolEn(user, 1)).resolves.toBe('veterinario');
    await expect(service.rolEn(user, 2)).resolves.toBe('operario');
  });

  it('un veterinario creado desde el panel no baja a operario por la membresía por defecto', async () => {
    await expect(service.rolEn(usuario('veterinario', { 1: 'operario' }, 1), 1)).resolves.toBe('veterinario');
  });

  it('sin pertenecer al campo no hay rol', async () => {
    await expect(service.rolEn(usuario('admin', { 1: 'dueno' }), 9)).resolves.toBeNull();
  });

  it('lee la membresía de la base cuando el token todavía no la trae', async () => {
    membresias['7:5'] = 'dueno';
    await expect(service.rolEn(usuario('admin'), 5)).resolves.toBe('admin');
  });

  it('super_admin es admin en cualquier campo', async () => {
    await expect(service.rolEn(usuario('super_admin'), 9)).resolves.toBe('admin');
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('exigirAdminDe rechaza a quien no administra el campo', async () => {
    conDueno = [2];
    const user = usuario('admin', { 1: 'dueno', 2: 'operario' });

    await expect(service.exigirAdminDe(user, 1)).resolves.toBeUndefined();
    await expect(service.exigirAdminDe(user, 2)).rejects.toThrow(ForbiddenException);
  });
});
