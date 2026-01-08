import { Module } from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import { TratamientosController } from './tratamientos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TratamientoEntity } from './entities/tratamiento.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity'; // ← AGREGAR
import { JwtStrategy } from '../auth/jwt.strategy';
//import { TerneroTratamientoEntity } from '../terneros-tratamientos/entities/terneros-tratamiento.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TratamientoEntity,
      TerneroEntity, // ← AGREGAR AQUÍ
      //TerneroTratamientoEntity,
    ]),
  ],
  controllers: [TratamientosController],
  providers: [TratamientosService, JwtStrategy],
})
export class TratamientosModule {}
