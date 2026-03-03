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
      // Usamos JWT_SECRET del .env o un fallback por seguridad
      secretOrKey: configService.get<string>('JWT_SECRET') || 'mysecretjwt',
    });
  }

  async validate(payload: any) {
    console.log('🔓 Payload recibido:', payload);

    return {
      // 👇 LA CORRECCIÓN MÁGICA:
      // Leemos 'sub' (estándar JWT) O 'id' (por si acaso). Así nunca falla.
      userId: payload.sub || payload.id,
      id: payload.sub || payload.id, // Devolvemos también 'id' plano para facilitar las cosas

      username: payload.name,
      rol: payload.rol,
      id_establecimiento: payload.id_establecimiento,
    };
  }
}
