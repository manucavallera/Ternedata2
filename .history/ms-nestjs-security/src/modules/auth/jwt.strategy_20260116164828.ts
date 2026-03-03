// ms-nestjs-security/src/modules/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 👇 CORRECCIÓN AQUÍ:
      // 1. Buscamos 'JWT_SECRET' (nombre estándar en .env)
      // 2. Ponemos un OR (||) para que si falla, use una palabra por defecto y no rompa el servidor
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'palabra_secreta_super_segura',
    });
  }

  async validate(payload: any) {
    // ... (El resto de tu código validate está bien)
    console.log('\n' + '🔓 [SECURITY] JWT DECODIFICADO:');
    console.log('='.repeat(60));
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('='.repeat(60) + '\n');

    return {
      userId: payload.id, // Ojo: verifica si tu token trae 'id' o 'sub'
      username: payload.name,
      rol: payload.rol,
      id_establecimiento: payload.id_establecimiento,
    };
  }
}
