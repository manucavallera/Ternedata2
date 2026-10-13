import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { ProductoForrajeria } from '../catalogo/entities/producto.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductoForrajeria, MovimientoStock]),
    EstablecimientosModule,
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [InventarioService],
})
export class InventarioForrajeriaModule {}
