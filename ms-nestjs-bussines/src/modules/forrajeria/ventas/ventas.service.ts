import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { FormaPago, PedidoEstado, PedidoForrajeria } from './entities/pedido.entity';
import { PedidoItemForrajeria } from './entities/pedido-item.entity';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { ContactoForrajeria, TipoContacto } from '../contactos/entities/contacto.entity';
import { MovimientoStock, TipoMovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';

const transiciones: Record<PedidoEstado, PedidoEstado[]> = {
  [PedidoEstado.PENDIENTE]: [PedidoEstado.CONFIRMADO, PedidoEstado.CANCELADO],
  [PedidoEstado.CONFIRMADO]: [PedidoEstado.PREPARANDO, PedidoEstado.CANCELADO],
  [PedidoEstado.PREPARANDO]: [PedidoEstado.LISTO, PedidoEstado.CANCELADO],
  [PedidoEstado.LISTO]: [PedidoEstado.ENTREGADO],
  [PedidoEstado.ENTREGADO]: [],
  [PedidoEstado.CANCELADO]: [],
};

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(PedidoForrajeria) private readonly pedidoRepository: Repository<PedidoForrajeria>,
    @InjectRepository(PedidoItemForrajeria) private readonly itemRepository: Repository<PedidoItemForrajeria>,
    @InjectRepository(ProductoForrajeria) private readonly productoRepository: Repository<ProductoForrajeria>,
    @InjectRepository(ContactoForrajeria) private readonly contactoRepository: Repository<ContactoForrajeria>,
    @InjectRepository(MovimientoStock) private readonly movimientoStockRepository: Repository<MovimientoStock>,
    @InjectRepository(MovimientoCuentaForrajeria) private readonly movimientoCuentaRepository: Repository<MovimientoCuentaForrajeria>,
    private readonly dataSource: DataSource,
  ) {}

  async createPedido(idEstablecimiento: number, dto: CreatePedidoDto) {
    return this.dataSource.transaction(async (manager) => {
      const contactoRepository = manager.getRepository(ContactoForrajeria);
      const productoRepository = manager.getRepository(ProductoForrajeria);
      const pedidoRepository = manager.getRepository(PedidoForrajeria);
      const itemRepository = manager.getRepository(PedidoItemForrajeria);
      const cliente = await contactoRepository.findOne({
        where: { id_contacto: dto.id_cliente, id_establecimiento: idEstablecimiento, tipo: TipoContacto.CLIENTE, es_productor: true },
      });
      if (!cliente) throw new NotFoundException('Cliente no encontrado en la organización activa');
      if (!dto.items?.length) throw new BadRequestException('El pedido debe tener al menos un producto');

      const productos = await productoRepository.find({
        where: { id_establecimiento: idEstablecimiento, id_producto: In(dto.items.map((item) => item.id_producto)) },
      });
      if (productos.length !== new Set(dto.items.map((item) => item.id_producto)).size) {
        throw new NotFoundException('Uno o más productos no pertenecen a la organización activa');
      }
      const porId = new Map(productos.map((producto) => [producto.id_producto, producto]));
      const items = dto.items.map((item) => {
        const producto = porId.get(item.id_producto)!;
        const subtotal = Number(item.cantidad) * Number(producto.precio);
        return { ...item, precio_unitario: Number(producto.precio), subtotal };
      });
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      const pedido = await pedidoRepository.save(pedidoRepository.create({
        id_establecimiento: idEstablecimiento,
        id_cliente: dto.id_cliente,
        estado: PedidoEstado.PENDIENTE,
        subtotal: total,
        total,
        forma_entrega: dto.forma_entrega,
        forma_pago: dto.forma_pago ?? FormaPago.CONTADO,
        direccion_entrega: dto.direccion_entrega,
        zona_entrega: dto.zona_entrega,
        observaciones: dto.observaciones,
      }));
      const guardados = await itemRepository.save(items.map((item) => itemRepository.create({ ...item, id_pedido: pedido.id_pedido })));
      return { ...pedido, items: guardados };
    });
  }

  findPedidos(idEstablecimiento: number) {
    return this.pedidoRepository.find({ where: { id_establecimiento: idEstablecimiento }, order: { fecha_creacion: 'DESC' } });
  }

  async cambiarEstado(idEstablecimiento: number, idPedido: number, estado: PedidoEstado) {
    return this.dataSource.transaction(async (manager) => {
      const pedidoRepository = manager.getRepository(PedidoForrajeria);
      const itemRepository = manager.getRepository(PedidoItemForrajeria);
      const productoRepository = manager.getRepository(ProductoForrajeria);
      const movimientoStockRepository = manager.getRepository(MovimientoStock);
      const movimientoCuentaRepository = manager.getRepository(MovimientoCuentaForrajeria);
      const pedido = await pedidoRepository.findOne({ where: { id_pedido: idPedido, id_establecimiento: idEstablecimiento } });
      if (!pedido) throw new NotFoundException('Pedido no encontrado en la organización activa');
      if (!transiciones[pedido.estado]?.includes(estado)) throw new BadRequestException('Transición de estado no permitida');
      if (estado === PedidoEstado.CONFIRMADO) {
        const items = await itemRepository.find({ where: { id_pedido: idPedido } });
        const productos = new Map<number, ProductoForrajeria>();
        for (const item of items) {
          const producto = await productoRepository.findOne({ where: { id_producto: item.id_producto, id_establecimiento: idEstablecimiento } });
          if (!producto || Number(producto.stock_actual) < Number(item.cantidad)) throw new BadRequestException('Stock insuficiente para confirmar el pedido');
          productos.set(item.id_producto, producto);
        }
        for (const item of items) {
          const producto = productos.get(item.id_producto)!;
          const stockAnterior = Number(producto.stock_actual);
          const stockNuevo = stockAnterior - Number(item.cantidad);
          producto.stock_actual = stockNuevo;
          await productoRepository.save(producto);
          await movimientoStockRepository.save(movimientoStockRepository.create({
            id_establecimiento: idEstablecimiento,
            id_producto: item.id_producto,
            tipo: TipoMovimientoStock.SALIDA,
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Pedido #${idPedido} confirmado`,
          }));
        }
      }
      if (estado === PedidoEstado.CANCELADO && [PedidoEstado.CONFIRMADO, PedidoEstado.PREPARANDO].includes(pedido.estado)) {
        const items = await itemRepository.find({ where: { id_pedido: idPedido } });
        for (const item of items) {
          const producto = await productoRepository.findOne({ where: { id_producto: item.id_producto, id_establecimiento: idEstablecimiento } });
          if (!producto) throw new NotFoundException('Producto del pedido no encontrado en la organización activa');
          const stockAnterior = Number(producto.stock_actual);
          const stockNuevo = stockAnterior + Number(item.cantidad);
          producto.stock_actual = stockNuevo;
          await productoRepository.save(producto);
          await movimientoStockRepository.save(movimientoStockRepository.create({
            id_establecimiento: idEstablecimiento,
            id_producto: item.id_producto,
            tipo: TipoMovimientoStock.ENTRADA,
            cantidad: item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Pedido #${idPedido} cancelado`,
          }));
        }
      }
      if (estado === PedidoEstado.ENTREGADO && pedido.forma_pago === FormaPago.CREDITO) {
        await movimientoCuentaRepository.save(movimientoCuentaRepository.create({
          id_establecimiento: idEstablecimiento,
          id_contacto: pedido.id_cliente,
          concepto: `Venta pedido #${idPedido}`,
          debe: Number(pedido.total),
          haber: 0,
        }));
      }
      pedido.estado = estado;
      return pedidoRepository.save(pedido);
    });
  }
}
