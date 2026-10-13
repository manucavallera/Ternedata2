import { CatalogoService } from './catalogo.service';
import { UnidadVenta } from './entities/producto.entity';

describe('CatalogoService', () => {
  const categoriaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const productoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  let service: CatalogoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CatalogoService(categoriaRepository as any, productoRepository as any);
  });

  it('asigna la organización activa al crear un producto', async () => {
    const producto = {
      id_producto: 3,
      id_establecimiento: 12,
      nombre: 'Maíz partido',
      unidad_venta: UnidadVenta.BOLSA,
      precio: 18000,
      costo: 15000,
      stock_actual: 0,
      stock_minimo: 2,
    };
    productoRepository.create.mockImplementation((dto) => dto);
    productoRepository.save.mockResolvedValue(producto);

    await expect(
      service.createProducto(12, {
        nombre: 'Maíz partido',
        unidad_venta: UnidadVenta.BOLSA,
        precio: 18000,
        costo: 15000,
        stock_minimo: 2,
      }),
    ).resolves.toEqual(producto);

    expect(productoRepository.create).toHaveBeenCalledWith({
      nombre: 'Maíz partido',
      unidad_venta: UnidadVenta.BOLSA,
      precio: 18000,
      costo: 15000,
      stock_minimo: 2,
      id_establecimiento: 12,
      stock_actual: 0,
    });
  });

  it('filtra productos por la organización activa', async () => {
    productoRepository.find.mockResolvedValue([]);

    await service.findProductos(12);

    expect(productoRepository.find).toHaveBeenCalledWith({
      where: { id_establecimiento: 12 },
      order: { nombre: 'ASC' },
    });
  });
});
