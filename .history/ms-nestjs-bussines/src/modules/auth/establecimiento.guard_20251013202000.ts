// ms-nestjs-business/src/modules/auth/establecimiento.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_ESTABLECIMIENTO_CHECK = 'skipEstablecimientoCheck';

/**
 * Guard que inyecta el id_establecimiento del usuario autenticado
 * en el request para filtrado automático en los servicios.
 *
 * Se ejecuta DESPUÉS de JwtAuthGuard.
 * Los admins pueden ver todos los establecimientos (opcional).
 */
@Injectable()
export class EstablecimientoGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si el endpoint tiene decorador para saltar verificación
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ESTABLECIMIENTO_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Validar que existe usuario (debería venir de JwtAuthGuard)
    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Validar que el usuario tiene establecimiento asignado
    // NOTA: Los admins pueden no tener establecimiento (ven todos)
    if (user.rol !== 'admin' && !user.id_establecimiento) {
      throw new ForbiddenException(
        'Usuario sin establecimiento asignado. Contacte al administrador.',
      );
    }

    // Inyectar id_establecimiento en el request para uso en servicios
    // Si es admin y no tiene establecimiento, puede ver todos (null)
    request.id_establecimiento = user.id_establecimiento || null;
    request.es_admin = user.rol === 'admin';

    return true;
  }
}
