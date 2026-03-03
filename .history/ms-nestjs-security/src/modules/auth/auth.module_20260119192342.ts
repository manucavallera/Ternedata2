import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
// 👇 1. IMPORTAR LA ENTIDAD INTERMEDIA
import { UserEstablecimientoEntity } from 'src/modules/users/entity/user-establecimiento.entity';

@Module({
  imports: [
    ConfigModule,
    // 👇 2. AGREGARLA AQUÍ DENTRO
    TypeOrmModule.forFeature([UserEntity, UserEstablecimientoEntity]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        // ⚠️ OJO: Asegúrate que tu .env usa 'JWT_SECRET'. Si usas 'secret', déjalo así.
        secret:
          configService.get<string>('JWT_SECRET') ||
          configService.get<string>('secret'),
        signOptions: { expiresIn: '30d' }, // Aumenté a 30 días para evitar desconexiones rápidas en dev
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
