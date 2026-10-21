import { CatalogoService } from './catalogo.service';
import { UnidadVenta } from './entities/producto.entity';

describe('CatalogoService', () => {
  const categoriaRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const productoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
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

  describe('updateProducto', () => {
    it('cambia precio y da de baja sin tocar el stock', async () => {
      const producto = { id_producto: 3, id_establecimiento: 12, precio: 100, stock_actual: 8, estado: 'activo' };
      productoRepository.findOne.mockResolvedValue(producto);
      productoRepository.save.mockImplementation(async (p) => p);

      const editado = await service.updateProducto(12, 3, { precio: 150, estado: 'inactivo' });
      expect(editado).toMatchObject({ precio: 150, estado: 'inactivo', stock_actual: 8 });
      expect(productoRepository.findOne).toHaveBeenCalledWith({ where: { id_producto: 3, id_establecimiento: 12 } });
    });

    it('404 si el producto es de otra organización', async () => {
      productoRepository.findOne.mockResolvedValue(null);
      await expect(service.updateProducto(12, 99, { precio: 1 })).rejects.toThrow('no encontrado');
      expect(productoRepository.save).not.toHaveBeenCalled();
    });

    it('no acepta una categoría de otra organización', async () => {
      productoRepository.findOne.mockResolvedValue({ id_producto: 3, id_establecimiento: 12 });
      categoriaRepository.findOne.mockResolvedValue(null);
      await expect(service.updateProducto(12, 3, { id_categoria: 50 })).rejects.toThrow('Categoría');
      expect(productoRepository.save).not.toHaveBeenCalled();
    });
  });

  it('edita una categoría de la organización', async () => {
    categoriaRepository.findOne.mockResolvedValue({ id_categoria: 1, id_establecimiento: 12, nombre: 'Granos' });
    categoriaRepository.save.mockImplementation(async (c) => c);
    await expect(service.updateCategoria(12, 1, { nombre: 'Cereales' })).resolves.toMatchObject({ nombre: 'Cereales' });
  });
});
