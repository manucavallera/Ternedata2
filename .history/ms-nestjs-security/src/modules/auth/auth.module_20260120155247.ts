import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
// 👇 1. IMPORTAR LA ENTIDAD
import { UserEstablecimientoEntity } from 'src/modules/users/entity/user-establecimiento.entity';

@Module({
  imports: [
    ConfigModule,
    // 👇 2. AGREGARLA AQUÍ DENTRO DEL ARRAY (¡Esto es lo que falta!)
    TypeOrmModule.forFeature([UserEntity, UserEstablecimientoEntity]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('secret'), // O 'JWT_SECRET' según tu .env
        signOptions: { expiresIn: '30d' },
      }),

      // 👇 GENERADOR DE TOKENS PARA PRUEBAS
      crearTokenMagico() {
        const payload = {
          email: 'veterinario_final@gmail.com', // El email que usarás en el registro
          id_establecimiento: 10, // El ID de tu granja (asegúrate que exista)
          rol: 'veterinario',
        };

        // Esto firma el token con TU clave secreta real del .env
        const token = this.jwtService.sign(payload);

        return {
          token_para_copiar: token,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
