// ms-nestjs-business/src/modules/auth/jwt.strategy.ts
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
      secretOrKey: configservice.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.id,
      username: payload.name,
      rol: payload.rol,
      id_establecimiento: payload.id_establecimiento, // 🆕 AGREGAR ESTA LÍNEA
    };
  }
}
