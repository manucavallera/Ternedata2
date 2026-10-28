import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { ContactoForrajeria } from '../contactos/entities/contacto.entity';
import { MovimientoCuentaForrajeria } from '../cuentas/entities/movimiento-cuenta.entity';
import { MovimientoStock } from '../inventario/entities/movimiento-stock.entity';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { CompraItemForrajeria } from './entities/compra-item.entity';
import { CompraForrajeria } from './entities/compra.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompraForrajeria,
      CompraItemForrajeria,
      ProductoForrajeria,
      ContactoForrajeria,
      MovimientoStock,
      MovimientoCuentaForrajeria,
    ]),
    EstablecimientosModule,
  ],
  controllers: [ComprasController],
  providers: [ComprasService],
})
export class ComprasForrajeriaModule {}
