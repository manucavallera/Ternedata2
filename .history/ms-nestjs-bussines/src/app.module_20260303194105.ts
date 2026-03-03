import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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

// 👇 1. AGREGAR ESTA IMPORTACIÓN
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),

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
        synchronize: true,
        autoLoadEntities: true,
        ssl: false, // Forzá que siempre sea false para Ternedata por ahora
      }),
    }),

    // 👇 2. AGREGAR ESTE BLOQUE DE CONFIGURACIÓN
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'manucavallera44@gmail.com', // Tu correo real
          pass: 'xyyj pqsn tlwv zmxl', // Tu contraseña de aplicación
        },
        // 👇 AGREGA ESTO: Ignorar error de certificado local (Antivirus)
        tls: {
          rejectUnauthorized: false,
        },
      },
      defaults: {
        from: '"Soporte Ternedata" <manucavallera44@gmail.com>',
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
