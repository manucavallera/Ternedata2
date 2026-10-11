import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactoForrajeria } from '../contactos/entities/contacto.entity';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { PedidoItemForrajeria } from './entities/pedido-item.entity';
import { PedidoEstado, PedidoForrajeria } from './entities/pedido.entity';
import { MovimientoStock, TipoMovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';
import { VentasService } from './ventas.service';

describe('VentasService', () => {
  const repos = new Map<any, any>();
  const manager = { getRepository: jest.fn((entity) => repos.get(entity)) };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
  const pedidoRepository = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const itemRepository = { create: jest.fn(), save: jest.fn(), find: jest.fn() };
  const productoRepository = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
  const contactoRepository = { findOne: jest.fn() };
  const movimientoStockRepository = { create: jest.fn(), save: jest.fn() };
  const movimientoCuentaRepository = { create: jest.fn(), save: jest.fn() };
  let service: VentasService;

  beforeEach(() => {
    jest.clearAllMocks();
    repos.set(PedidoForrajeria, pedidoRepository);
    repos.set(PedidoItemForrajeria, itemRepository);
    repos.set(ProductoForrajeria, productoRepository);
    repos.set(ContactoForrajeria, contactoRepository);
    repos.set(MovimientoStock, movimientoStockRepository);
    repos.set(MovimientoCuentaForrajeria, movimientoCuentaRepository);
    service = new VentasService(
      pedidoRepository as any,
      itemRepository as any,
      productoRepository as any,
      contactoRepository as any,
      movimientoStockRepository as any,
      movimientoCuentaRepository as any,
      dataSource as any,
    );
  });

  it('crea un pedido con precio congelado y total calculado', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 5, es_productor: true });
    productoRepository.find.mockResolvedValue([{ id_producto: 2, precio: '1000' }, { id_producto: 3, precio: '250' }]);
    const pedido = { id_pedido: 10, total: 2500 };
    pedidoRepository.create.mockImplementation((value) => value);
    pedidoRepository.save.mockResolvedValue({ ...pedido, id_pedido: 10 });
    itemRepository.create.mockImplementation((value) => value);
    itemRepository.save.mockImplementation((value) => value);

    const result = await service.createPedido(12, { id_cliente: 5, items: [{ id_producto: 2, cantidad: 2 }, { id_producto: 3, cantidad: 2 }] });

    expect(result.total).toBe(2500);
    expect(itemRepository.create).toHaveBeenCalledWith(expect.objectContaining({ id_producto: 2, precio_unitario: 1000, subtotal: 2000, id_pedido: 10 }));
  });

  it('no permite crear pedidos con productos de otra organización', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 5, es_productor: true });
    productoRepository.find.mockResolvedValue([]);

    await expect(service.createPedido(12, { id_cliente: 5, items: [{ id_producto: 99, cantidad: 1 }] })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza confirmar si el stock es insuficiente', async () => {
    pedidoRepository.findOne.mockResolvedValue({ id_pedido: 10, id_establecimiento: 12, estado: PedidoEstado.PENDIENTE });
    itemRepository.find.mockResolvedValue([{ id_producto: 2, cantidad: 5 }]);
    productoRepository.findOne.mockResolvedValue({ id_producto: 2, stock_actual: 2 });

    await expect(service.cambiarEstado(12, 10, PedidoEstado.CONFIRMADO)).rejects.toBeInstanceOf(BadRequestException);
    expect(productoRepository.save).not.toHaveBeenCalled();
  });

  it('descuenta stock y registra el movimiento al confirmar un pedido', async () => {
    pedidoRepository.findOne.mockResolvedValue({ id_pedido: 10, id_establecimiento: 12, estado: PedidoEstado.PENDIENTE });
    itemRepository.find.mockResolvedValue([{ id_producto: 2, cantidad: 5 }]);
    productoRepository.findOne.mockResolvedValue({ id_producto: 2, stock_actual: 8 });
    movimientoStockRepository.create.mockImplementation((value) => value);
    movimientoStockRepository.save.mockResolvedValue({ id_movimiento: 20 });
    pedidoRepository.save.mockImplementation((value) => value);

    await service.cambiarEstado(12, 10, PedidoEstado.CONFIRMADO);

    expect(productoRepository.save).toHaveBeenCalledWith(expect.objectContaining({ stock_actual: 3 }));
    expect(movimientoStockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      id_establecimiento: 12,
      id_producto: 2,
      tipo: TipoMovimientoStock.SALIDA,
      cantidad: 5,
      stock_anterior: 8,
      stock_nuevo: 3,
      motivo: 'Pedido #10 confirmado',
    }));
  });

  it('registra el debe del productor al entregar un pedido a crédito', async () => {
    pedidoRepository.findOne.mockResolvedValue({
      id_pedido: 10,
      id_establecimiento: 12,
      id_cliente: 5,
      estado: PedidoEstado.LISTO,
      total: '2500',
      forma_pago: 'credito',
    });
    movimientoCuentaRepository.create.mockImplementation((value) => value);
    movimientoCuentaRepository.save.mockResolvedValue({ id_movimiento: 30 });
    pedidoRepository.save.mockImplementation((value) => value);

    await service.cambiarEstado(12, 10, PedidoEstado.ENTREGADO);

    expect(movimientoCuentaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      id_establecimiento: 12,
      id_contacto: 5,
      concepto: 'Venta pedido #10',
      debe: 2500,
      haber: 0,
    }));
  });

  it('revierte stock al cancelar un pedido ya confirmado', async () => {
    pedidoRepository.findOne.mockResolvedValue({ id_pedido: 10, id_establecimiento: 12, estado: PedidoEstado.CONFIRMADO });
    itemRepository.find.mockResolvedValue([{ id_producto: 2, cantidad: 5 }]);
    productoRepository.findOne.mockResolvedValue({ id_producto: 2, stock_actual: 3 });
    movimientoStockRepository.create.mockImplementation((value) => value);
    movimientoStockRepository.save.mockResolvedValue({ id_movimiento: 21 });
    pedidoRepository.save.mockImplementation((value) => value);

    await service.cambiarEstado(12, 10, PedidoEstado.CANCELADO);

    expect(productoRepository.save).toHaveBeenCalledWith(expect.objectContaining({ stock_actual: 8 }));
    expect(movimientoStockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      tipo: TipoMovimientoStock.ENTRADA,
      cantidad: 5,
      stock_anterior: 3,
      stock_nuevo: 8,
      motivo: 'Pedido #10 cancelado',
    }));
  });
});
