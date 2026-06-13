// ms-nestjs-business/src/modules/auth/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator'; // ✅ Importar desde el decorator

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Si no se especifican roles, permitir acceso
    }

    const { user } = context.switchToHttp().getRequest();

    // ✅ AGREGAR ESTOS LOGS:
    console.log('🎭 RolesGuard - Roles requeridos:', requiredRoles);
    console.log('👤 RolesGuard - Usuario:', user);
    console.log('🔑 RolesGuard - Rol del usuario:', user?.rol);
    console.log(
      '✅ RolesGuard - Tiene permiso?:',
      requiredRoles.some((role) => user.rol === role),
    );

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const hasRole = requiredRoles.some((role) => user.rol === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
