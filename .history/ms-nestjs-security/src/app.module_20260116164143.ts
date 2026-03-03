// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

// 👇 1. IMPÓRTALAS AQUÍ
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
        synchronize: false,
        autoLoadEntities: true,

        // 👇 2. AGREGA ESTA LISTA EXPLÍCITA
        entities: [UserEntity, UserEstablecimientoEntity, Establecimiento],

        ssl:
          configService.get<string>('ENTORNO_ENV') === 'produccion'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
