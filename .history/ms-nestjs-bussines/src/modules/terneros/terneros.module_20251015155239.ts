import { Module } from '@nestjs/common';
import { TernerosService } from './terneros.service';
import { TernerosController } from './terneros.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerneroEntity } from './entities/ternero.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { MadreEntity } from '../madres/entities/madre.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
//import { TerneroTratamientoEntity } from '../terneros-tratamientos/entities/terneros-tratamiento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';
// ⬅️ ELIMINADO: import { PadreEntity } from '../padres/entities/padre.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TerneroEntity,
      MadreEntity,
      EventoEntity,
      TerneroTratamientoEntity,
      DiarreaTerneroEntity,
      // ⬅️ ELIMINADO: PadreEntity
    ]),
  ],
  controllers: [TernerosController],
  providers: [TernerosService, JwtStrategy],
})
export class TernerosModule {}
