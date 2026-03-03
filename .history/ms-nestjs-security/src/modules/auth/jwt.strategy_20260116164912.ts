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
      // 👇 CORRECCIÓN: Usamos el nombre exacto que tienes en tu .env
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // 🆕 LOG: Ver el payload decodificado
    console.log('\n' + '🔓 [SECURITY] JWT DECODIFICADO:');
    console.log('='.repeat(60));
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('='.repeat(60) + '\n');

    return {
      userId: payload.id || payload.sub, // 'sub' es el estándar JWT para ID
      username: payload.name,
      rol: payload.rol,
      id_establecimiento: payload.id_establecimiento,
    };
  }
}
