import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitacionEntity } from './invitacion.entity
import { v4 as uuidv4 } from 'uuid';
import {
  RolEstablecimiento,
  UserEstablecimientoEntity,
} from '../users/entity/user-establecimiento.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class InvitacionesService {
  constructor(
    @InjectRepository(InvitacionEntity)
    private readonly invitacionRepo: Repository<InvitacionEntity>,

    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepo: Repository<UserEstablecimientoEntity>,

    private readonly usersService: UsersService,
  ) {}

  async generarLink(establecimientoId: number, rol: RolEstablecimiento) {
    const token = uuidv4();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 48); // 48hs de validez

    const invitacion = this.invitacionRepo.create({
      token,
      establecimientoId,
      rol,
      expiracion,
    });

    await this.invitacionRepo.save(invitacion);

    // ⚠️ CAMBIA ESTA URL por la de tu Frontend real cuando despliegues
    return {
      link: `http://localhost:3000/join?token=${token}`,
      token: token,
    };
  }

  async aceptarLink(token: string, userId: number) {
    // 1. Validar Link
    const invitacion = await this.invitacionRepo.findOne({
      where: { token, usado: false },
    });

    if (!invitacion)
      throw new HttpException(
        'Link inválido o ya usado',
        HttpStatus.BAD_REQUEST,
      );
    if (new Date() > invitacion.expiracion)
      throw new HttpException('Link expirado', HttpStatus.BAD_REQUEST);

    // 2. Validar si ya es miembro
    const existe = await this.userEstablecimientoRepo.findOne({
      where: { userId, establecimientoId: invitacion.establecimientoId },
    });

    if (existe)
      throw new HttpException(
        'Ya eres parte de este equipo',
        HttpStatus.CONFLICT,
      );

    // 3. Crear Relación
    await this.userEstablecimientoRepo.save({
      userId,
      establecimientoId: invitacion.establecimientoId,
      rol: invitacion.rol,
    });

    // 4. Cerrar Invitación
    await this.invitacionRepo.update(invitacion.id, { usado: true });

    // 5. Actualizar "vista" del usuario para que entre directo a ese campo
    await this.usersService.assignEstablecimiento(
      userId,
      invitacion.establecimientoId,
    );

    return {
      message: '¡Te has unido al equipo exitosamente!',
      establecimientoId: invitacion.establecimientoId,
    };
  }
}
