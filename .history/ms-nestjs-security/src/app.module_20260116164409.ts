// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';

// 👇 IMPORTA ESTAS 3 COSAS MANUALMENTE
import { UserEntity } from './modules/users/entity/users.entity';
import { UserEstablecimientoEntity } from './modules/users/entity/user-establecimiento.entity';
import { Establecimiento } from './modules/users/entity/establecimiento.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      /* ... */
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        // ... (resto de tus configs de conexión) ...

        synchronize: false,
        autoLoadEntities: true,

        // 👇 ¡ESTA ES LA CLAVE! AGREGA ESTA LÍNEA OBLIGATORIAMENTE:
        entities: [UserEntity, UserEstablecimientoEntity, Establecimiento],

        // ...
      }),
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
