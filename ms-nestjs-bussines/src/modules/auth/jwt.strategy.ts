import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configservice: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configservice.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET no configurado — abortando boot');
        return secret;
      })(),
    });
  }

  async validate(payload: any) {
    // Solo tokens de sesión: con id de usuario y sin "type". Con el mismo secreto se
    // firman los de verificación de email y reset de contraseña, y antes también los
    // de /auth/generar-token (sin id y con el rol que pidiera quien lo generaba).
    if ((!payload?.id && !payload?.sub) || payload?.type) {
      throw new UnauthorizedException('Token inválido');
    }
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
