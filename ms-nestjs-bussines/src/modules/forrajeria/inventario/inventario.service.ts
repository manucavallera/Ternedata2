import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { MovimientoStock, TipoMovimientoStock } from './entities/movimiento-stock.entity';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(ProductoForrajeria)
    private readonly productoRepository: Repository<ProductoForrajeria>,
    @InjectRepository(MovimientoStock)
    private readonly movimientoRepository: Repository<MovimientoStock>,
    private readonly dataSource: DataSource,
  ) {}

  async registrarMovimiento(
    idEstablecimiento: number,
    idProducto: number,
    dto: CreateMovimientoStockDto,
  ): Promise<{ movimiento: MovimientoStock; stock_nuevo: number }> {
    return this.dataSource.transaction(async (manager) => {
      const productoRepository = manager.getRepository(ProductoForrajeria);
      const movimientoRepository = manager.getRepository(MovimientoStock);
      const producto = await productoRepository.findOne({
        where: { id_producto: idProducto, id_establecimiento: idEstablecimiento },
      });

      if (!producto) {
        throw new NotFoundException('Producto no encontrado en la organización activa');
      }

      const stockAnterior = Number(producto.stock_actual || 0);
      const cantidad = Number(dto.cantidad);
      const signo = dto.tipo === TipoMovimientoStock.SALIDA ? -1 : 1;
      const stockNuevo = dto.tipo === TipoMovimientoStock.AJUSTE
        ? cantidad
        : stockAnterior + signo * cantidad;

      if (stockNuevo < 0) {
        throw new BadRequestException('El movimiento dejaría el stock en negativo');
      }

      producto.stock_actual = stockNuevo;
      await productoRepository.save(producto);

      const movimiento = movimientoRepository.create({
        id_establecimiento: idEstablecimiento,
        id_producto: idProducto,
        tipo: dto.tipo,
        cantidad,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        motivo: dto.motivo,
      });
      const guardado = await movimientoRepository.save(movimiento);

      return { movimiento: guardado, stock_nuevo: stockNuevo };
    });
  }

  findMovimientos(idEstablecimiento: number, idProducto?: number) {
    return this.movimientoRepository.find({
      where: idProducto
        ? { id_establecimiento: idEstablecimiento, id_producto: idProducto }
        : { id_establecimiento: idEstablecimiento },
      order: { fecha_creacion: 'DESC' },
    });
  }

  findBajoStock(idEstablecimiento: number) {
    return this.productoRepository
      .createQueryBuilder('producto')
      .where('producto.id_establecimiento = :idEstablecimiento', { idEstablecimiento })
      .andWhere('producto.stock_actual <= producto.stock_minimo')
      .orderBy('producto.stock_actual', 'ASC')
      .getMany();
  }
}
