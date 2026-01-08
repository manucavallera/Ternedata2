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
    return {
      userId: payload.id,
      username: payload.name,
      rol: payload.rol, // ⬅️ DEBE ESTAR ESTA LÍNEA
    };
  }
}
