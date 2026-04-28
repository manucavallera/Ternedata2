// ms-nestjs-security/src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

// 👇 IMPORTANTE: Importamos las entidades manualmente
import { UserEntity } from './modules/users/entity/users.entity';
import { UserEstablecimientoEntity } from './modules/users/entity/user-establecimiento.entity';
import { Establecimiento } from './modules/users/entity/establecimiento.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 👇 DEBUG: Verificamos en consola qué está leyendo
        const dbPassword = configService.get<string>('database.password');
        return {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),

          password: dbPassword,

          database: configService.get<string>('database.name'),
          synchronize: false,
          autoLoadEntities: true,

          // 👇 MANTENER ESTO PARA QUE NO VUELVA EL ERROR 500
          entities: [UserEntity, UserEstablecimientoEntity, Establecimiento],

          ssl: false,
        };
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
