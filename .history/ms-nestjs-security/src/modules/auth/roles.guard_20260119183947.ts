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

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // 1. PRIMER INTENTO: ¿Tiene el rol de forma global?
    // (Ej: Es Admin del sistema o su rol base coincide)
    const hasGlobalRole = requiredRoles.some((role) => user.rol === role);
    if (hasGlobalRole) return true;

    // 2. SEGUNDO INTENTO: ¿Es Veterinario/Admin en ALGUNA de sus granjas?
    // Esto permite que pase el filtro. Luego el Controller se encargará
    // de mostrarle solo SUS datos y no los de otros.
    if (user.userEstablecimientos && Array.isArray(user.userEstablecimientos)) {
      const hasSpecificRole = user.userEstablecimientos.some((ue) =>
        requiredRoles.some((reqRole) => ue.rol === reqRole),
      );

      if (hasSpecificRole) return true;
    }

    // Si fallan ambos, entonces sí: FUERA.
    throw new ForbiddenException(
      `Acceso denegado. Tu rol global es '${user.rol}' y no tienes permisos especiales en ninguna granja para entrar aquí.`,
    );
  }
}
