import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, UserRole } from './roles.decorator';
import { RolEstablecimientoService } from './rol-establecimiento.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly rolEstablecimiento: RolEstablecimientoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Super admin is a platform role and bypasses establishment-level roles.
    if (user.rol === 'super_admin') return true;

    const denegado = new ForbiddenException(
      `Acceso denegado. Se requiere uno de estos roles: ${requiredRoles.join(', ')}`,
    );

    // Con un establecimiento en juego (lo fija EstablecimientoGuard) vale el rol
    // que el usuario tiene EN ESE establecimiento, no el de algún otro.
    if (request.id_establecimiento) {
      const rol = await this.rolEstablecimiento.rolEn(
        user,
        request.id_establecimiento,
      );
      if (rol && requiredRoles.includes(rol)) return true;
      throw denegado;
    }

    // Sin establecimiento en juego (crear uno, usuarios, invitaciones) alcanza con
    // el rol global o el de alguna granja ('dueno' equivale a 'admin'): cada
    // controller valida después contra el establecimiento que toca.
    const tieneRol =
      requiredRoles.some((role) => user.rol === role) ||
      (user.userEstablecimientos || []).some((ue: any) =>
        requiredRoles.some(
          (role) => ue.rol === role || (role === 'admin' && ue.rol === 'dueno'),
        ),
      );
    if (tieneRol) return true;

    throw denegado;
  }
}
