import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configservice: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configservice.get<string>('JWT_SECRET') || 'secretKey', // Asegúrate que coincida con tu .env
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub || payload.id, // Aceptamos ambos por compatibilidad
      username: payload.name,
      rol: payload.rol, // Rol Global (ej. Operario)
      id_establecimiento: payload.id_establecimiento,
      // 👇 ¡ESTO ES LO QUE FALTABA! Recuperamos la lista del token
      userEstablecimientos: payload.userEstablecimientos || [],
    };
  }
}
