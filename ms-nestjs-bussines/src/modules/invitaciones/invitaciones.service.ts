import { Injectable, HttpException, HttpStatus, ConflictException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(InvitacionesService.name);

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
    if (email) {
      const pendiente = await this.invitacionRepo.findOne({
        where: { email, establecimientoId, usado: false },
      });
      if (pendiente) {
        throw new ConflictException('Ya existe una invitación pendiente para ese email en este establecimiento');
      }
    }

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

    if (email) {
      try {
        await this.mailService.sendMail({
          to: email,
          subject: '🐮 Invitación a Ternedata',
          html: `
            <h1>¡Hola!</h1>
            <p>Has sido invitado a colaborar en Ternedata.</p>
            <p>Tu rol será: <b>${rol}</b></p>
            <p>Haz clic aquí para aceptar:</p>
            <a href="${process.env.FRONTEND_URL}/join?token=${token}&email=${encodeURIComponent(email)}">Aceptar Invitación</a>
          `,
        });
        this.logger.log(`Invitación enviada a ${email}`);
      } catch (error) {
        this.logger.error(`Error enviando invitación a ${email}`, error);
      }
    }

    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    return {
      link: `${process.env.FRONTEND_URL}/join?token=${token}${emailParam}`,
      token: token,
      emailEnviado: email || null,
    };
  }

  async getPendientes(establecimientoId: number): Promise<InvitacionEntity[]> {
    return this.invitacionRepo.find({
      where: { establecimientoId, usado: false },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async revocar(id: number): Promise<{ message: string }> {
    const invitacion = await this.invitacionRepo.findOne({ where: { id } });
    if (!invitacion) {
      throw new HttpException('Invitación no encontrada', HttpStatus.NOT_FOUND);
    }
    await this.invitacionRepo.remove(invitacion);
    return { message: 'Invitación revocada' };
  }

  // Acepta automáticamente todas las invitaciones pendientes para el email del usuario
  async aceptarPorEmail(userId: number): Promise<{ aceptadas: number }> {
    const user = await this.usersService.findOne(userId);
    if (!user?.email) return { aceptadas: 0 };

    const invitaciones = await this.invitacionRepo.find({
      where: { email: user.email, usado: false },
    });

    let aceptadas = 0;
    for (const inv of invitaciones) {
      if (new Date() > inv.expiracion) continue;

      const existe = await this.userEstablecimientoRepo.findOne({
        where: { userId, establecimientoId: inv.establecimientoId },
      });

      if (existe) {
        await this.invitacionRepo.update(inv.id, { usado: true });
        aceptadas++;
        continue;
      }

      await this.userEstablecimientoRepo.save({
        userId,
        establecimientoId: inv.establecimientoId,
        rol: inv.rol,
      });
      await this.invitacionRepo.update(inv.id, { usado: true });
      await this.usersService.assignEstablecimiento(userId, inv.establecimientoId);
      aceptadas++;
    }

    return { aceptadas };
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

    if (existe) {
      // Marcar la invitación como usada aunque el usuario ya sea miembro
      await this.invitacionRepo.update(invitacion.id, { usado: true });
      throw new HttpException(
        'Ya eres parte de este equipo',
        HttpStatus.CONFLICT,
      );
    }

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
