import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_ESTABLECIMIENTO_CHECK = 'skipEstablecimientoCheck';

@Injectable()
export class EstablecimientoGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_ESTABLECIMIENTO_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // --- LOGS DE CONTROL ---
    console.log('🔐 EstablecimientoGuard - Usuario:', user?.username);
    console.log('🏢 ID Principal:', user?.id_establecimiento);
    console.log('🚜 Granjas Extra:', user?.userEstablecimientos?.length || 0);

    if (!user) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // 1. Si es ADMIN, pasa con su establecimiento (no null)
    if (user.rol === 'admin') {
      request.id_establecimiento = user.id_establecimiento || null;
      request.es_admin = true;
      return true;
    }

    // 2. LOGICA INTELIGENTE: Determinar el ID del establecimiento
    let establecimientoId = user.id_establecimiento;

    // Si no tiene ID principal, pero tiene invitaciones aceptadas, usamos la primera
    if (!establecimientoId && user.userEstablecimientos?.length > 0) {
      establecimientoId = user.userEstablecimientos[0].establecimientoId;
      console.log('🔄 Redirigiendo a granja invitada:', establecimientoId);
    }

    // 3. Verificación Final
    if (!establecimientoId) {
      throw new ForbiddenException(
        'Usuario sin establecimiento asignado ni invitaciones activas.',
      );
    }

    // Inyectamos el ID decidido en el request para que lo usen los servicios (Madres, etc.)
    request.id_establecimiento = establecimientoId;
    request.es_admin = false;

    return true;
  }
}
