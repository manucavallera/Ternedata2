import { EstablecimientosService } from './establecimientos.service';
import { OrganizacionTipo } from './organizacion-tipo.enum';
import { validate } from 'class-validator';
import { CreateEstablecimientoDto } from './dto/establecimiento.dto';

describe('EstablecimientosService', () => {
  const establecimientoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const userEstablecimientoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };
  const usersService = {
    assignEstablecimiento: jest.fn(),
    findOneRaw: jest.fn(),
  };

  let service: EstablecimientosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EstablecimientosService(
      establecimientoRepository as any,
      userEstablecimientoRepository as any,
      usersService as any,
    );
  });

  it('crea una organización ganadera por compatibilidad cuando no se especifica tipo', async () => {
    const creado = { id_establecimiento: 10, nombre: 'La Esperanza' };
    establecimientoRepository.create.mockImplementation((dto) => dto);
    establecimientoRepository.save.mockResolvedValue(creado);
    userEstablecimientoRepository.create.mockReturnValue({});
    userEstablecimientoRepository.save.mockResolvedValue({});

    const result = await service.create({ nombre: 'La Esperanza' }, 4);

    expect(establecimientoRepository.create).toHaveBeenCalledWith({
      nombre: 'La Esperanza',
      tipo_organizacion: OrganizacionTipo.GANADERIA,
    });
    expect(result).toEqual(creado);
    expect(establecimientoRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('crea una organización de forrajería cuando se solicita explícitamente', async () => {
    const creado = { id_establecimiento: 11, nombre: 'Forrajes del Centro', tipo_organizacion: OrganizacionTipo.FORRAJERIA };
    establecimientoRepository.create.mockImplementation((dto) => dto);
    establecimientoRepository.save.mockResolvedValue(creado);
    userEstablecimientoRepository.create.mockReturnValue({});
    userEstablecimientoRepository.save.mockResolvedValue({});

    const result = await service.create(
      { nombre: 'Forrajes del Centro', tipo_organizacion: OrganizacionTipo.FORRAJERIA },
      4,
    );

    expect(establecimientoRepository.create).toHaveBeenCalledWith({
      nombre: 'Forrajes del Centro',
      tipo_organizacion: OrganizacionTipo.FORRAJERIA,
    });
    expect(result.tipo_organizacion).toBe(OrganizacionTipo.FORRAJERIA);
    // Arranca con el catálogo base.
    expect(establecimientoRepository.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('si falla el catálogo base, la forrajería igual queda creada', async () => {
    const creado = { id_establecimiento: 12, tipo_organizacion: OrganizacionTipo.FORRAJERIA };
    establecimientoRepository.create.mockImplementation((dto) => dto);
    establecimientoRepository.save.mockResolvedValue(creado);
    establecimientoRepository.manager.transaction.mockRejectedValue(new Error('sin base'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      service.create({ nombre: 'F', tipo_organizacion: OrganizacionTipo.FORRAJERIA }, 0),
    ).resolves.toEqual(creado);
  });

  it('valida que el tipo de organización pertenezca al enum público', async () => {
    const dto = Object.assign(new CreateEstablecimientoDto(), {
      nombre: 'Organización inválida',
      tipo_organizacion: 'otro',
    });

    const errores = await validate(dto);

    expect(errores.map((error) => error.property)).toContain('tipo_organizacion');
  });

  describe('cambiarRolMiembro', () => {
    it('cambia el rol de un miembro en ese campo', async () => {
      const fila = { establecimientoId: 10, userId: 5, rol: 'operario' };
      userEstablecimientoRepository.findOne.mockResolvedValue(fila);
      userEstablecimientoRepository.save.mockResolvedValue(fila);

      await expect(service.cambiarRolMiembro(10, 5, 'veterinario' as any, 4)).resolves.toEqual({ userId: 5, rol: 'veterinario' });
      expect(userEstablecimientoRepository.save).toHaveBeenCalledWith(expect.objectContaining({ rol: 'veterinario' }));
    });

    it('no deja cambiarse el rol a uno mismo', async () => {
      await expect(service.cambiarRolMiembro(10, 4, 'operario' as any, 4)).rejects.toThrow('propio rol');
      expect(userEstablecimientoRepository.save).not.toHaveBeenCalled();
    });

    it('no deja el campo sin dueño', async () => {
      userEstablecimientoRepository.findOne.mockResolvedValue({ establecimientoId: 10, userId: 5, rol: 'dueno' });
      userEstablecimientoRepository.count.mockResolvedValue(1);

      await expect(service.cambiarRolMiembro(10, 5, 'operario' as any, 4)).rejects.toThrow('sin dueño');
      expect(userEstablecimientoRepository.save).not.toHaveBeenCalled();
    });

    it('crea la membresía si estaba asignado solo como campo principal', async () => {
      userEstablecimientoRepository.findOne.mockResolvedValue(null);
      usersService.findOneRaw.mockResolvedValue({ id: 5, id_establecimiento: 10 });
      userEstablecimientoRepository.create.mockImplementation((d) => d);

      await service.cambiarRolMiembro(10, 5, 'veterinario' as any, 4);
      expect(userEstablecimientoRepository.save).toHaveBeenCalledWith({ establecimientoId: 10, userId: 5, rol: 'veterinario' });
    });

    it('404 si no es miembro', async () => {
      userEstablecimientoRepository.findOne.mockResolvedValue(null);
      usersService.findOneRaw.mockResolvedValue({ id: 5, id_establecimiento: 99 });

      await expect(service.cambiarRolMiembro(10, 5, 'operario' as any, 4)).rejects.toThrow('no es miembro');
    });
  });

  it('el equipo muestra el rol del campo y no el global', async () => {
    userEstablecimientoRepository.find.mockResolvedValue([
      { userId: 4, rol: 'dueno', user: { name: 'Ana', email: 'a@x.com', rol: 'admin' } },
    ]);
    (usersService as any).findByEstablecimiento = jest.fn().mockResolvedValue([]);

    const equipo = await service.getEquipo(10);
    expect(equipo[0].rol).toBe('dueno');
  });
});
