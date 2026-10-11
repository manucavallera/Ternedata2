import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { ContactoForrajeria } from '../contactos/entities/contacto.entity';
import { MovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { PedidoItemForrajeria } from './entities/pedido-item.entity';
import { PedidoForrajeria } from './entities/pedido.entity';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PedidoForrajeria,
      PedidoItemForrajeria,
      ProductoForrajeria,
      ContactoForrajeria,
      MovimientoStock,
      MovimientoCuentaForrajeria,
    ]),
    EstablecimientosModule,
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasForrajeriaModule {}
