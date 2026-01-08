import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../users/entity/users.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    console.log('🔒 Roles requeridos:', requiredRoles); // ⬅️ AGREGAR

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    console.log('👤 Usuario en request:', user); // ⬅️ AGREGAR
    console.log('🎭 Rol del usuario:', user?.rol); // ⬅️ AGREGAR

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    const hasRole = requiredRoles.some((role) => user.rol === role);

    console.log('✅ Tiene permiso?', hasRole); // ⬅️ AGREGAR

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
