import { TernerosService } from './terneros.service';

describe('TernerosService - seguimiento', () => {
  const terneroRepository = {
    create: jest.fn(),
    findOne: jest.fn().mockResolvedValue({
      id_ternero: 7,
      id_establecimiento: 62,
      rp_ternero: 717,
      fecha_nacimiento: new Date('2026-09-01'),
      peso_nacer: 40,
    }),
    save: jest.fn(),
  };
  const madreRepository = {};
  const rodeoRepository = {};
  const pesajeRepository = {
    create: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
  };
  const calostradoRepository = {
    create: jest.fn(),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn(),
  };

  let service: TernerosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TernerosService(
      terneroRepository as any,
      madreRepository as any,
      rodeoRepository as any,
      pesajeRepository as any,
      calostradoRepository as any,
    );
  });

  it('guarda un pesaje por fecha y establecimiento', async () => {
    const pesaje = {
      id_pesaje: 1,
      id_ternero: 7,
      id_establecimiento: 62,
      fecha: '2026-09-08',
      peso: 42,
      observaciones: 'TEST peso',
    };
    pesajeRepository.create.mockImplementation((data) => data);
    pesajeRepository.save.mockResolvedValue(pesaje);

    const result = await service.crearPesaje(7, 62, {
      fecha: '2026-09-08',
      peso: 42,
      observaciones: 'TEST peso',
    });

    expect(pesajeRepository.create).toHaveBeenCalledWith({
      id_ternero: 7,
      id_establecimiento: 62,
      fecha: '2026-09-08',
      peso: 42,
      observaciones: 'TEST peso',
    });
    expect(result.peso).toBe(42);
    expect(result.id_establecimiento).toBe(62);
  });

  it('actualiza el pesaje existente del mismo día', async () => {
    const existente = {
      id_pesaje: 1,
      id_ternero: 7,
      id_establecimiento: 62,
      fecha: '2026-09-08',
      peso: 42,
    };
    pesajeRepository.findOne.mockResolvedValue(existente);
    pesajeRepository.save.mockResolvedValue({ ...existente, peso: 43 });

    const result = await service.crearPesaje(7, 62, {
      fecha: '2026-09-08',
      peso: 43,
    });

    expect(pesajeRepository.create).not.toHaveBeenCalled();
    expect(pesajeRepository.save).toHaveBeenCalledWith({
      ...existente,
      peso: 43,
      observaciones: undefined,
    });
    expect(result.peso).toBe(43);
  });

  it('guarda cada toma de calostrado como un registro independiente', async () => {
    const calostrado = {
      id_calostrado: 1,
      id_ternero: 7,
      id_establecimiento: 62,
      fecha_hora: '2026-09-09T08:30:00.000Z',
      metodo: 'mamadera',
      litros: 2.5,
      grado_brix: 22.5,
    };
    calostradoRepository.create.mockImplementation((data) => data);
    calostradoRepository.save.mockResolvedValue(calostrado);

    const result = await service.crearCalostrado(7, 62, {
      fecha_hora: '2026-09-09T08:30:00.000Z',
      metodo: 'mamadera',
      litros: 2.5,
      grado_brix: 22.5,
    });

    expect(calostradoRepository.create).toHaveBeenCalledWith({
      id_ternero: 7,
      id_establecimiento: 62,
      fecha_hora: '2026-09-09T08:30:00.000Z',
      metodo: 'mamadera',
      litros: 2.5,
      grado_brix: 22.5,
      observaciones: undefined,
    });
    expect(result.litros).toBe(2.5);
  });
});
