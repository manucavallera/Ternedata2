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
      secretOrKey: configservice.get<string>('secret'),
    });
  }

  async validate(payload: any) {
    // Ahora incluimos el rol en el objeto user que se inyecta en el request
    return {
      userId: payload.id,
      username: payload.name,
      rol: payload.rol, // ⬅️ NUEVO: incluir rol del usuario
    };
  }
}
