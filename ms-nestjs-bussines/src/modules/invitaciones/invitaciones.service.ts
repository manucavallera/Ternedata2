import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvitacionEntity } from './invitacion.entity';
import { v4 as uuidv4 } from 'uuid';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { UsersService } from '../users/users.service';
import { RolEstablecimiento } from './roles.enum';
// 👇 1. IMPORTAR EL MAILER
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class InvitacionesService {
  constructor(
    @InjectRepository(InvitacionEntity)
    private readonly invitacionRepo: Repository<InvitacionEntity>,

    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepo: Repository<UserEstablecimientoEntity>,

    private readonly usersService: UsersService,

    // 👇 2. INYECTAR EL SERVICIO DE CORREO
    private readonly mailService: MailerService,
  ) {}

  async generarLink(
    establecimientoId: number,
    rol: RolEstablecimiento,
    email?: string,
  ) {
    console.log('🔧 SERVICIO: Iniciando generarLink');
    console.log('📧 Email recibido en servicio:', email);

    const token = uuidv4();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 48);

    const datosInvitacion: any = {
      token,
      establecimientoId,
      rol,
      expiracion,
    };

    if (email) {
      datosInvitacion.email = email;
    }

    const invitacion = this.invitacionRepo.create(datosInvitacion);
    await this.invitacionRepo.save(invitacion);

    // 👇 3. LÓGICA DE ENVÍO DE EMAIL (¡ESTO FALTABA!)
    if (email) {
      console.log('📨 INTENTANDO enviar email a:', email);
      try {
        await this.mailService.sendMail({
          to: email,
          subject: '🐮 Invitación a Ternedata',
          html: `
            <h1>¡Hola!</h1>
            <p>Has sido invitado a colaborar en Ternedata.</p>
            <p>Tu rol será: <b>${rol}</b></p>
            <p>Haz clic aquí para aceptar:</p>
            <a href="${process.env.FRONTEND_URL}/join?token=${token}">Aceptar Invitación</a>
          `,
        });
        console.log('✅ NODEMAILER: Email enviado con éxito');
      } catch (error) {
        console.error('❌ NODEMAILER ERROR:', error);
      }
    } else {
      console.log('⚠️ SE SALTÓ EL ENVÍO (no hay email)');
    }

    return {
      link: `${process.env.FRONTEND_URL}/join?token=${token}`,
      token: token,
      emailEnviado: email || null,
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

    // 5. Actualizar "vista" del usuario
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
