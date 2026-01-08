import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosService } from './establecimientos.service';
import { EstablecimientosController } from './establecimientos.controller';
import { Establecimiento } from './entities/establecimiento.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Establecimiento])],
  controllers: [EstablecimientosController],
  providers: [EstablecimientosService],
  exports: [EstablecimientosService], // Para usarlo en otros módulos
})
export class EstablecimientosModule {}
