import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { ContactoForrajeria, TipoContacto } from '../contactos/entities/contacto.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';
import { MovimientoStock, TipoMovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { CreateCompraDto } from './dto/create-compra.dto';
import { CompraItemForrajeria } from './entities/compra-item.entity';
import { CompraForrajeria, FormaPagoCompra } from './entities/compra.entity';

const redondear = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ComprasService {
  constructor(
    @InjectRepository(CompraForrajeria) private readonly compraRepository: Repository<CompraForrajeria>,
    @InjectRepository(CompraItemForrajeria) private readonly itemRepository: Repository<CompraItemForrajeria>,
    @InjectRepository(ProductoForrajeria) private readonly productoRepository: Repository<ProductoForrajeria>,
    @InjectRepository(ContactoForrajeria) private readonly contactoRepository: Repository<ContactoForrajeria>,
    private readonly dataSource: DataSource,
  ) {}

  // Registra la compra en una transacción: suma stock (con su movimiento), actualiza el costo
  // y, si es a crédito, deja la deuda con el proveedor en su cuenta (haber: le debemos).
  async createCompra(idEstablecimiento: number, dto: CreateCompraDto) {
    return this.dataSource.transaction(async (manager) => {
      const contactoRepository = manager.getRepository(ContactoForrajeria);
      const productoRepository = manager.getRepository(ProductoForrajeria);
      const compraRepository = manager.getRepository(CompraForrajeria);
      const itemRepository = manager.getRepository(CompraItemForrajeria);
      const movimientoStockRepository = manager.getRepository(MovimientoStock);
      const movimientoCuentaRepository = manager.getRepository(MovimientoCuentaForrajeria);

      const proveedor = await contactoRepository.findOne({
        where: { id_contacto: dto.id_proveedor, id_establecimiento: idEstablecimiento, tipo: TipoContacto.PROVEEDOR },
      });
      if (!proveedor) throw new NotFoundException('Proveedor no encontrado en la organización activa');
      if (proveedor.estado === 'inactivo') throw new BadRequestException(`El proveedor "${proveedor.nombre}" está dado de baja`);
      if (!dto.items?.length) throw new BadRequestException('La compra debe tener al menos un producto');

      const ids = dto.items.map((item) => item.id_producto);
      if (new Set(ids).size !== ids.length) throw new BadRequestException('Hay un producto repetido en la compra');
      const productos = await productoRepository.find({
        where: { id_establecimiento: idEstablecimiento, id_producto: In(ids) },
      });
      if (productos.length !== ids.length) {
        throw new NotFoundException('Uno o más productos no pertenecen a la organización activa');
      }
      const inactivo = productos.find((producto) => producto.estado === 'inactivo');
      if (inactivo) throw new BadRequestException(`El producto "${inactivo.nombre}" está dado de baja`);

      const items = dto.items.map((item) => ({
        ...item,
        subtotal: redondear(Number(item.cantidad) * Number(item.costo_unitario)),
      }));
      const total = redondear(items.reduce((suma, item) => suma + item.subtotal, 0));
      const formaPago = dto.forma_pago ?? FormaPagoCompra.CONTADO;

      const compra = await compraRepository.save(compraRepository.create({
        id_establecimiento: idEstablecimiento,
        id_proveedor: proveedor.id_contacto,
        total,
        forma_pago: formaPago,
        comprobante: dto.comprobante,
        observaciones: dto.observaciones,
      }));
      const guardados = await itemRepository.save(
        items.map((item) => itemRepository.create({ ...item, id_compra: compra.id_compra })),
      );

      const porId = new Map(productos.map((producto) => [producto.id_producto, producto]));
      const actualizarCosto = dto.actualizar_costo !== false;
      for (const item of items) {
        const producto = porId.get(item.id_producto)!;
        const stockAnterior = Number(producto.stock_actual || 0);
        const stockNuevo = stockAnterior + Number(item.cantidad);
        producto.stock_actual = stockNuevo;
        if (actualizarCosto && Number(item.costo_unitario) > 0) producto.costo = Number(item.costo_unitario);
        await productoRepository.save(producto);
        await movimientoStockRepository.save(movimientoStockRepository.create({
          id_establecimiento: idEstablecimiento,
          id_producto: item.id_producto,
          tipo: TipoMovimientoStock.ENTRADA,
          cantidad: item.cantidad,
          stock_anterior: stockAnterior,
          stock_nuevo: stockNuevo,
          motivo: `Compra #${compra.id_compra} a ${proveedor.nombre}`.slice(0, 200),
        }));
      }

      if (formaPago === FormaPagoCompra.CREDITO && total > 0) {
        await movimientoCuentaRepository.save(movimientoCuentaRepository.create({
          id_establecimiento: idEstablecimiento,
          id_contacto: proveedor.id_contacto,
          concepto: `Compra #${compra.id_compra}${dto.comprobante ? ` (${dto.comprobante})` : ''}`.slice(0, 200),
          debe: 0,
          haber: total,
        }));
      }

      return { ...compra, items: guardados };
    });
  }

  // Compras con el nombre del proveedor y los productos de cada una.
  async findCompras(idEstablecimiento: number, filtros: { id_proveedor?: number; id_compra?: number } = {}) {
    const where: Record<string, unknown> = { id_establecimiento: idEstablecimiento };
    if (filtros.id_proveedor) where.id_proveedor = filtros.id_proveedor;
    if (filtros.id_compra) where.id_compra = filtros.id_compra;
    const compras = await this.compraRepository.find({ where, order: { fecha_creacion: 'DESC' }, take: 300 });
    if (!compras.length) return [];

    const items = await this.itemRepository.find({ where: { id_compra: In(compras.map((c) => c.id_compra)) } });
    const idsProducto = [...new Set(items.map((i) => i.id_producto))];
    const idsProveedor = [...new Set(compras.map((c) => c.id_proveedor))];
    const [productos, proveedores] = await Promise.all([
      idsProducto.length
        ? this.productoRepository.find({ where: { id_establecimiento: idEstablecimiento, id_producto: In(idsProducto) } })
        : Promise.resolve([] as ProductoForrajeria[]),
      this.contactoRepository.find({ where: { id_establecimiento: idEstablecimiento, id_contacto: In(idsProveedor) } }),
    ]);
    const producto = new Map(productos.map((p) => [p.id_producto, p]));
    const proveedor = new Map(proveedores.map((p) => [p.id_contacto, p]));

    return compras.map((compra) => ({
      ...compra,
      proveedor: proveedor.has(compra.id_proveedor)
        ? { id_contacto: compra.id_proveedor, nombre: proveedor.get(compra.id_proveedor)!.nombre }
        : null,
      items: items
        .filter((item) => item.id_compra === compra.id_compra)
        .map((item) => ({
          ...item,
          producto: producto.has(item.id_producto)
            ? { nombre: producto.get(item.id_producto)!.nombre, unidad_venta: producto.get(item.id_producto)!.unidad_venta }
            : null,
        })),
    }));
  }

  async findCompra(idEstablecimiento: number, idCompra: number) {
    const [compra] = await this.findCompras(idEstablecimiento, { id_compra: idCompra });
    if (!compra) throw new NotFoundException('Compra no encontrada en la organización activa');
    return compra;
  }
}
