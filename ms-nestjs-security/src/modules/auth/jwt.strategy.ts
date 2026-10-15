import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Solo tokens de sesión: con id de usuario y sin "type". Con el mismo secreto se
    // firman los de verificación de email y reset de contraseña, y antes también los
    // de /auth/generar-token (sin id y con el rol que pidiera quien lo generaba).
    if ((!payload?.id && !payload?.sub) || payload?.type) {
      throw new UnauthorizedException('Token inválido');
    }
    // 👇 AQUÍ ESTÁ LA MAGIA: Pasamos la lista de granjas al usuario request
    return {
      userId: payload.sub || payload.id,
      id: payload.sub || payload.id,
      username: payload.name,
      rol: payload.rol, // Rol Global (ej. Operario)
      id_establecimiento: payload.id_establecimiento,
      // 👇 ¡ESTO ES LO QUE FALTABA!
      userEstablecimientos: payload.userEstablecimientos || [],
    };
  }
}
