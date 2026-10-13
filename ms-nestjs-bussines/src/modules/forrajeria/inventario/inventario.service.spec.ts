import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { TipoMovimientoStock } from './entities/movimiento-stock.entity';

describe('InventarioService', () => {
  const productoRepository = {};
  const movimientoRepository = {};
  const productoTransactionalRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const movimientoTransactionalRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity.name === 'ProductoForrajeria'
        ? productoTransactionalRepository
        : movimientoTransactionalRepository,
    ),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };

  let service: InventarioService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InventarioService(
      productoRepository as any,
      movimientoRepository as any,
      dataSource as any,
    );
  });

  it('incrementa el stock y registra una entrada en una transacción', async () => {
    const producto = { id_producto: 4, id_establecimiento: 12, stock_actual: 5 };
    const movimiento = { id_movimiento: 9 };
    productoTransactionalRepository.findOne.mockResolvedValue(producto);
    movimientoTransactionalRepository.create.mockReturnValue(movimiento);
    movimientoTransactionalRepository.save.mockResolvedValue(movimiento);

    await expect(
      service.registrarMovimiento(12, 4, {
        tipo: TipoMovimientoStock.ENTRADA,
        cantidad: 3,
        motivo: 'Compra',
      }),
    ).resolves.toEqual({ movimiento, stock_nuevo: 8 });

    expect(producto.stock_actual).toBe(8);
    expect(productoTransactionalRepository.save).toHaveBeenCalledWith(producto);
    expect(movimientoTransactionalRepository.create).toHaveBeenCalledWith({
      id_establecimiento: 12,
      id_producto: 4,
      tipo: TipoMovimientoStock.ENTRADA,
      cantidad: 3,
      stock_anterior: 5,
      stock_nuevo: 8,
      motivo: 'Compra',
    });
  });

  it('rechaza una salida que dejaría stock negativo', async () => {
    productoTransactionalRepository.findOne.mockResolvedValue({
      id_producto: 4,
      id_establecimiento: 12,
      stock_actual: 2,
    });

    await expect(
      service.registrarMovimiento(12, 4, {
        tipo: TipoMovimientoStock.SALIDA,
        cantidad: 3,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productoTransactionalRepository.save).not.toHaveBeenCalled();
    expect(movimientoTransactionalRepository.save).not.toHaveBeenCalled();
  });

  it('oculta productos de otra organización como no encontrados', async () => {
    productoTransactionalRepository.findOne.mockResolvedValue(null);

    await expect(
      service.registrarMovimiento(12, 99, {
        tipo: TipoMovimientoStock.ENTRADA,
        cantidad: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
