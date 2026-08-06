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

    // Establecimientos a los que el usuario REALMENTE tiene acceso:
    // su principal + los que aceptó por invitación. Nadie ve fuera de esto,
    // sea admin o no (todo dueño se registra como admin, así que "admin" NO
    // significa superusuario global).
    const permitidos: number[] = Array.from(
      new Set(
        [
          user.id_establecimiento,
          ...(user.userEstablecimientos || []).map(
            (ue: any) => ue.establecimientoId,
          ),
        ].filter((v) => v !== null && v !== undefined),
      ),
    );

    // El front puede pedir cambiar de campo (EstablecimientoSelector) por
    // query o body. Solo se permite si ese campo está en la lista del usuario.
    const pedido =
      request.query?.id_establecimiento ?? request.body?.id_establecimiento;
    const pedidoId =
      pedido !== undefined && pedido !== null && pedido !== ''
        ? parseInt(pedido, 10)
        : null;

    if (pedidoId !== null && !permitidos.includes(pedidoId)) {
      throw new ForbiddenException('No tenés acceso a ese establecimiento');
    }

    // ID efectivo: el pedido (ya validado) o el principal o el primero disponible
    const efectivo =
      pedidoId ?? user.id_establecimiento ?? permitidos[0] ?? null;

    if (!efectivo) {
      throw new ForbiddenException(
        'Usuario sin establecimiento asignado ni invitaciones activas.',
      );
    }

    request.id_establecimiento = efectivo;
    request.establecimientos_permitidos = permitidos;
    request.es_admin = user.rol === 'admin' || user.rol === 'super_admin';

    return true;
  }
}
