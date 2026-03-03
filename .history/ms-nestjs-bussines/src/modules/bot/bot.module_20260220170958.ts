// src/modules/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './bot.controller';
import { BotApiKeyGuard } from './api-key.guard';

// TypeORM
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { TernerosService } from '../terneros/terneros.service';
import { MadresService } from '../madres/madres.service';
import { EventosService } from '../eventos/eventos.service';
import { TratamientosService } from '../tratamientos/tratamientos.service';
import { DiarreaTernerosService } from '../diarrea-terneros/diarrea-terneros.service';

// Entities
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';
import { TratamientoEntity } from '../tratamientos/entities/tratamiento.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TerneroEntity,
      MadreEntity,
      EventoEntity,
      DiarreaTerneroEntity,
      TratamientoEntity,
      UserEntity, // ← NUEVO
      UserEstablecimientoEntity, // ← NUEVO
    ]),
  ],
  controllers: [BotController],
  providers: [
    BotApiKeyGuard,
    TernerosService,
    MadresService,
    EventosService,
    TratamientosService,
    DiarreaTernerosService,
  ],
})
export class BotModule {}
