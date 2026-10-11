import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { ContactoForrajeria } from '../contactos/entities/contacto.entity';
import { CuentasController } from './cuentas.controller';
import { CuentasService } from './cuentas.service';
import { MovimientoCuentaForrajeria } from './entities/movimiento-cuenta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContactoForrajeria, MovimientoCuentaForrajeria]),
    EstablecimientosModule,
  ],
  controllers: [CuentasController],
  providers: [CuentasService],
  exports: [CuentasService],
})
export class CuentasForrajeriaModule {}
