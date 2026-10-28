import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { ContactoForrajeria, TipoContacto } from '../contactos/entities/contacto.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';
import { MovimientoStock, TipoMovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { ComprasService } from './compras.service';
import { CompraItemForrajeria } from './entities/compra-item.entity';
import { CompraForrajeria, FormaPagoCompra } from './entities/compra.entity';

describe('ComprasService', () => {
  const repos = new Map<any, any>();
  const manager = { getRepository: jest.fn((entity) => repos.get(entity)) };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
  const identidad = (value: any) => value;
  const compraRepository = { create: jest.fn(identidad), save: jest.fn(), find: jest.fn() };
  const itemRepository = { create: jest.fn(identidad), save: jest.fn(identidad), find: jest.fn() };
  const productoRepository = { find: jest.fn(), save: jest.fn(identidad) };
  const contactoRepository = { findOne: jest.fn(), find: jest.fn() };
  const movimientoStockRepository = { create: jest.fn(identidad), save: jest.fn(identidad) };
  const movimientoCuentaRepository = { create: jest.fn(identidad), save: jest.fn(identidad) };
  let service: ComprasService;

  const proveedor = { id_contacto: 7, nombre: 'Molino Sur', tipo: TipoContacto.PROVEEDOR, estado: 'activo' };

  beforeEach(() => {
    jest.clearAllMocks();
    repos.set(CompraForrajeria, compraRepository);
    repos.set(CompraItemForrajeria, itemRepository);
    repos.set(ProductoForrajeria, productoRepository);
    repos.set(ContactoForrajeria, contactoRepository);
    repos.set(MovimientoStock, movimientoStockRepository);
    repos.set(MovimientoCuentaForrajeria, movimientoCuentaRepository);
    compraRepository.save.mockImplementation((value) => ({ ...value, id_compra: 40 }));
    service = new ComprasService(
      compraRepository as any,
      itemRepository as any,
      productoRepository as any,
      contactoRepository as any,
      dataSource as any,
    );
  });

  it('suma stock, actualiza el costo y deja la deuda con el proveedor si es a crédito', async () => {
    contactoRepository.findOne.mockResolvedValue(proveedor);
    const fardo = { id_producto: 2, nombre: 'Fardo', stock_actual: '5', costo: '500', estado: 'activo' };
    productoRepository.find.mockResolvedValue([fardo]);

    const compra = await service.createCompra(12, {
      id_proveedor: 7,
      forma_pago: FormaPagoCompra.CREDITO,
      comprobante: 'A-0001',
      items: [{ id_producto: 2, cantidad: 10, costo_unitario: 650 }],
    });

    expect(compra.total).toBe(6500);
    expect(fardo.stock_actual).toBe(15);
    expect(fardo.costo).toBe(650);
    expect(movimientoStockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      tipo: TipoMovimientoStock.ENTRADA, cantidad: 10, stock_anterior: 5, stock_nuevo: 15, motivo: 'Compra #40 a Molino Sur',
    }));
    expect(movimientoCuentaRepository.create).toHaveBeenCalledWith({
      id_establecimiento: 12, id_contacto: 7, concepto: 'Compra #40 (A-0001)', debe: 0, haber: 6500,
    });
  });

  it('al contado no toca la cuenta y puede no actualizar el costo', async () => {
    contactoRepository.findOne.mockResolvedValue(proveedor);
    const maiz = { id_producto: 3, nombre: 'Maíz', stock_actual: '0', costo: '100', estado: 'activo' };
    productoRepository.find.mockResolvedValue([maiz]);

    await service.createCompra(12, {
      id_proveedor: 7,
      actualizar_costo: false,
      items: [{ id_producto: 3, cantidad: 2.5, costo_unitario: 120 }],
    });

    expect(maiz.stock_actual).toBe(2.5);
    expect(maiz.costo).toBe('100');
    expect(movimientoCuentaRepository.save).not.toHaveBeenCalled();
  });

  it('no acepta un cliente o un proveedor de otra organización', async () => {
    contactoRepository.findOne.mockResolvedValue(null);
    await expect(
      service.createCompra(12, { id_proveedor: 5, items: [{ id_producto: 2, cantidad: 1, costo_unitario: 1 }] }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(contactoRepository.findOne).toHaveBeenCalledWith({
      where: { id_contacto: 5, id_establecimiento: 12, tipo: TipoContacto.PROVEEDOR },
    });
  });

  it('rechaza productos de otra organización, repetidos o dados de baja', async () => {
    contactoRepository.findOne.mockResolvedValue(proveedor);
    productoRepository.find.mockResolvedValue([]);
    await expect(
      service.createCompra(12, { id_proveedor: 7, items: [{ id_producto: 99, cantidad: 1, costo_unitario: 1 }] }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.createCompra(12, {
        id_proveedor: 7,
        items: [{ id_producto: 2, cantidad: 1, costo_unitario: 1 }, { id_producto: 2, cantidad: 1, costo_unitario: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    productoRepository.find.mockResolvedValue([{ id_producto: 2, nombre: 'Viejo', estado: 'inactivo' }]);
    await expect(
      service.createCompra(12, { id_proveedor: 7, items: [{ id_producto: 2, cantidad: 1, costo_unitario: 1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(compraRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza un proveedor dado de baja', async () => {
    contactoRepository.findOne.mockResolvedValue({ ...proveedor, estado: 'inactivo' });
    await expect(
      service.createCompra(12, { id_proveedor: 7, items: [{ id_producto: 2, cantidad: 1, costo_unitario: 1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
