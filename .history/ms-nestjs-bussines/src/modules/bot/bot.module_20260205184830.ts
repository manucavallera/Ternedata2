// src/modules/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './bot.controller';
import { BotApiKeyGuard } from './api-key.guard';

// Importamos los módulos existentes para reusar sus services
import { TernerosModule } from '../terneros/terneros.module';
import { MadresModule } from '../madres/madres.module';
import { EventosModule } from '../eventos/eventos.module';

// Importamos los services directamente + sus dependencias de TypeORM
import { TypeOrmModule } from '@nestjs/typeorm';
import { TernerosService } from '../terneros/terneros.service';
import { MadresService } from '../madres/madres.service';
import { EventosService } from '../eventos/eventos.service';

// Entities necesarias
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TerneroEntity,
      MadreEntity,
      EventoEntity,
      DiarreaTerneroEntity,
    ]),
  ],
  controllers: [BotController],
  providers: [BotApiKeyGuard, TernerosService, MadresService, EventosService],
})
export class BotModule {}
