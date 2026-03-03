import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // --- LOGS DE DEPURACIÓN (Borrar en producción) ---
    console.log('👮‍♂️ RolesGuard revisando a:', user.username);
    console.log('📋 Roles requeridos:', requiredRoles);
    console.log('👤 Rol Global:', user.rol);
    console.log(
      '🚜 Granjas con permisos:',
      user.userEstablecimientos?.length || 0,
    );
    // --------------------------------------------------

    // 1. CHEQUEO GLOBAL (¿Es Admin del sistema o su rol base coincide?)
    const hasGlobalRole = requiredRoles.some((role) => user.rol === role);
    if (hasGlobalRole) {
      console.log('✅ Acceso concedido por Rol Global');
      return true;
    }

    // 2. CHEQUEO ESPECÍFICO (¿Es Veterinario en alguna granja?)
    // 👇 ESTA ES LA PARTE QUE FALTABA EN TU CÓDIGO ACTUAL 👇
    if (user.userEstablecimientos && Array.isArray(user.userEstablecimientos)) {
      // Buscamos si en ALGUNA granja tiene el rol que pide el endpoint
      const hasSpecificRole = user.userEstablecimientos.some((ue) =>
        requiredRoles.some((reqRole) => ue.rol === reqRole),
      );

      if (hasSpecificRole) {
        console.log('✅ Acceso concedido por Rol Específico de Granja');
        return true;
      }
    }

    console.log(
      '⛔ Acceso denegado. No tienes el rol necesario ni global ni en granjas.',
    );
    throw new ForbiddenException(
      `Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
    );
  }
}
