import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitacionEntity } from './invitacion.entity';
import { v4 as uuidv4 } from 'uuid';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { UsersService } from '../users/users.service';
import { RolEstablecimiento } from './roles.enum';

@Injectable()
export class InvitacionesService {
  constructor(
    @InjectRepository(InvitacionEntity)
    private readonly invitacionRepo: Repository<InvitacionEntity>,

    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepo: Repository<UserEstablecimientoEntity>,

    private readonly usersService: UsersService,
  ) {}

  // 👇 MODIFICADO: Se agregó "email?: string" como tercer parámetro
  async generarLink(
    establecimientoId: number,
    rol: RolEstablecimiento,
    email?: string,
  ) {
    const token = uuidv4();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 48); // 48hs de validez

    // Creamos el objeto para guardar
    const datosInvitacion: any = {
      token,
      establecimientoId,
      rol,
      expiracion,
    };

    // Si tu entidad tiene la columna email, lo agregamos al objeto
    if (email) {
      datosInvitacion.email = email;
    }

    const invitacion = this.invitacionRepo.create(datosInvitacion);

    await this.invitacionRepo.save(invitacion);

    // Retornamos la info
    return {
      link: `http://localhost:3000/join?token=${token}`,
      token: token,
      emailEnviado: email || null, // Confirmación visual para el frontend
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
