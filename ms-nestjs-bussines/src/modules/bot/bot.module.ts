// src/modules/bot/bot.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotController } from './bot.controller';
import { BotApiKeyGuard } from './api-key.guard';
import { ClaudeService } from './webhook/claude.service';
import { AudioService } from './webhook/audio.service';
import { MessagingService } from './webhook/messaging.service';
import { DedupeService } from './webhook/dedupe.service';
import { LimitePorTelefono } from './webhook/limite-telefono';
import { RolEstablecimientoService } from '../auth/rol-establecimiento.service';
import { BotForrajeriaService } from './forrajeria/bot-forrajeria.service';
import { ContactosForrajeriaModule } from '../forrajeria/contactos/contactos.module';
import { CuentasForrajeriaModule } from '../forrajeria/cuentas/cuentas.module';
import { InventarioForrajeriaModule } from '../forrajeria/inventario/inventario.module';
import { VentasForrajeriaModule } from '../forrajeria/ventas/ventas.module';
import { ProductoForrajeria } from '../forrajeria/catalogo/entities/producto.entity';

// TypeORM
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { TernerosService } from '../terneros/terneros.service';
import { MadresService } from '../madres/madres.service';
import { EventosService } from '../eventos/eventos.service';
import { TratamientosService } from '../tratamientos/tratamientos.service';
import { DiarreaTernerosService } from '../diarrea-terneros/diarrea-terneros.service';
import { LitrosService } from '../litros/litros.service';
import { DietasService } from '../dietas/dietas.service';
import { ResumenSaludService } from '../resumen-salud/resumen-salud.service';

// Entities
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
import { DiarreaTerneroEntity } from '../diarrea-terneros/entities/diarrea-ternero.entity';
import { TratamientoEntity } from '../tratamientos/entities/tratamiento.entity';
import { UserEntity } from '../users/entity/users.entity';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { Rodeos } from '../rodeos/entities/rodeos.entity';
import { RegistroLitrosEntity } from '../litros/entities/registro-litros.entity';
import { RodeoDietaEntity } from '../dietas/entities/rodeo-dieta.entity';
import { PesajeTerneroEntity } from '../terneros/entities/pesaje-ternero.entity';
import { CalostradoTerneroEntity } from '../terneros/entities/calostrado-ternero.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TerneroEntity,
      MadreEntity,
      EventoEntity,
      DiarreaTerneroEntity,
      TratamientoEntity,
      UserEntity,
      UserEstablecimientoEntity,
      Establecimiento,
      Rodeos,
      RegistroLitrosEntity,
      RodeoDietaEntity,
      PesajeTerneroEntity,
      CalostradoTerneroEntity,
      ProductoForrajeria,
    ]),
    ContactosForrajeriaModule,
    CuentasForrajeriaModule,
    InventarioForrajeriaModule,
    VentasForrajeriaModule,
  ],
  controllers: [BotController],
  providers: [
    BotApiKeyGuard,
    ClaudeService,
    AudioService,
    MessagingService,
    DedupeService,
    LimitePorTelefono,
    RolEstablecimientoService,
    BotForrajeriaService,
    TernerosService,
    MadresService,
    EventosService,
    TratamientosService,
    DiarreaTernerosService,
    LitrosService,
    DietasService,
    ResumenSaludService,
  ],
})
export class BotModule {}
