import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RolEstablecimientoModule } from './modules/auth/rol-establecimiento.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { MadresModule } from './modules/madres/madres.module';
import { TernerosModule } from './modules/terneros/terneros.module';
import { EventosModule } from './modules/eventos/eventos.module';
import { TratamientosModule } from './modules/tratamientos/tratamientos.module';
import { DiarreaTernerosModule } from './modules/diarrea-terneros/diarrea-terneros.module';
import { ResumenSaludModule } from './modules/resumen-salud/resumen-salud.module';
import { EstablecimientosModule } from './modules/establecimientos/establecimientos.module';
import { RodeosModule } from './modules/rodeos/rodeos.module';
import { InvitacionesModule } from './modules/invitaciones/invitaciones.module';
import { BotModule } from './modules/bot/bot.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { LitrosModule } from './modules/litros/litros.module';
import { DietasModule } from './modules/dietas/dietas.module';
import { HistorialModule } from './modules/historial/historial.module';
import { SustitutoModule } from './modules/sustituto/sustituto.module';
import { CatalogoForrajeriaModule } from './modules/forrajeria/catalogo/catalogo.module';
import { InventarioForrajeriaModule } from './modules/forrajeria/inventario/inventario.module';
import { ContactosForrajeriaModule } from './modules/forrajeria/contactos/contactos.module';
import { CuentasForrajeriaModule } from './modules/forrajeria/cuentas/cuentas.module';
import { VentasForrajeriaModule } from './modules/forrajeria/ventas/ventas.module';

// 👇 1. AGREGAR ESTA IMPORTACIÓN
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    // THROTTLE_LIMIT solo para los tests de CI, que hacen cientos de pedidos por minuto
    ThrottlerModule.forRoot([{ ttl: 60000, limit: Number(process.env.THROTTLE_LIMIT) || 120 }]),
    RolEstablecimientoModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        synchronize: false, // NUNCA true: bussines comparte la tabla users con security; synchronize dropeaba password_reset_jti y rompía el login
        autoLoadEntities: true,
        ssl: false, // Forzá que siempre sea false para Ternedata por ahora
      }),
    }),

    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
      },
      defaults: {
        from: `"Soporte Ternedata" <${process.env.MAIL_USER}>`,
      },
    }),
    UsersModule,
    AuthModule,
    MadresModule,
    TernerosModule,
    EventosModule,
    TratamientosModule,
    DiarreaTernerosModule,
    ResumenSaludModule,
    EstablecimientosModule,
    RodeosModule,
    InvitacionesModule,
    BotModule,
    AlertsModule,
    LitrosModule,
    DietasModule,
    HistorialModule,
    SustitutoModule,
    CatalogoForrajeriaModule,
    InventarioForrajeriaModule,
    ContactosForrajeriaModule,
    CuentasForrajeriaModule,
    VentasForrajeriaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
