// ms-nestjs-security/src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // 👇 DEBUG: Verificamos en consola qué está leyendo
        const dbPassword = configService.get<string>('database.password');
        console.log(
          '🔌 Intentando conectar DB con pass:',
          dbPassword ? '******' : 'UNDEFINED',
        );

        return {
          type: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<number>('database.port'),
          username: configService.get<string>('database.username'),

          // 👇 LA SOLUCIÓN: Si falla la config, usa la contraseña "quemada"
          password: dbPassword || 'Manuelo12*',

          database: configService.get<string>('database.name'),
          synchronize: false,
          autoLoadEntities: true,

          // 👇 MANTENER ESTO PARA QUE NO VUELVA EL ERROR 500
          entities: [UserEntity, UserEstablecimientoEntity, Establecimiento],

          ssl:
            configService.get<string>('ENTORNO_ENV') === 'produccion'
              ? { rejectUnauthorized: false }
              : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
