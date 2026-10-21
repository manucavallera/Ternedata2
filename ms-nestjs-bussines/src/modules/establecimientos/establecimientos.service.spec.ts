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
  };
  const usersService = {
    assignEstablecimiento: jest.fn(),
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
});
