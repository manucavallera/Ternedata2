// src/modules/resumen-salud/resumen-salud.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumenSaludService } from './resumen-salud.service';
import { ResumenSaludController } from './resumen-salud.controller';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { TratamientoEntity } from '../tratamientos/entities/tratamiento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TerneroEntity,
      TratamientoEntity,
      DiarreaTerneroEntity,
    ]),
  ],
  controllers: [ResumenSaludController],
  providers: [ResumenSaludService],
})
export class ResumenSaludModule {}
