import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { ControlLecheroEntity } from './entities/control-lechero.entity';
import { EventoReproductivoEntity } from './entities/evento-reproductivo.entity';
import { TamboController } from './tambo.controller';
import { TamboService } from './tambo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventoReproductivoEntity,
      ControlLecheroEntity,
      MadreEntity,
      TerneroEntity,
      Establecimiento,
    ]),
  ],
  controllers: [TamboController],
  providers: [TamboService],
  exports: [TamboService],
})
export class TamboModule {}
