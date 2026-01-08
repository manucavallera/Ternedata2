import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosService } from './establecimientos.service';
import { EstablecimientosController } from './establecimientos.controller';
import { Establecimiento } from './entities/establecimiento.entity';
// 👇 1. Importar la entidad intermedia
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // 👇 2. Agregarla aquí para poder inyectar su Repository luego
    TypeOrmModule.forFeature([Establecimiento, UserEstablecimientoEntity]),
    UsersModule,
  ],
  controllers: [EstablecimientosController],
  providers: [EstablecimientosService],
  exports: [EstablecimientosService],
})
export class EstablecimientosModule {}
