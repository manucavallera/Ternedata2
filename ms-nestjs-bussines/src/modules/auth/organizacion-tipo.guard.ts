import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import {
  ORGANIZACION_TIPO_KEY,
} from './organizacion-tipo.decorator';
import { OrganizacionTipo } from '../establecimientos/organizacion-tipo.enum';

@Injectable()
export class OrganizacionTipoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepository: Repository<Establecimiento>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tipoRequerido = this.reflector.getAllAndOverride<OrganizacionTipo>(
      ORGANIZACION_TIPO_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!tipoRequerido) return true;

    const request = context.switchToHttp().getRequest();
    const idEstablecimiento = request.id_establecimiento;

    if (!idEstablecimiento) {
      throw new ForbiddenException('No hay una organización activa');
    }

    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id_establecimiento: idEstablecimiento },
    });

    if (!establecimiento || establecimiento.tipo_organizacion !== tipoRequerido) {
      throw new ForbiddenException(
        `Esta función requiere una organización de tipo ${tipoRequerido}`,
      );
    }

    return true;
  }
}
