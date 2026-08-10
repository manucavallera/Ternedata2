import { Injectable, HttpException, HttpStatus, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Raw, Repository } from 'typeorm';
import { InvitacionEntity } from './invitacion.entity';
import { v4 as uuidv4 } from 'uuid';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { UserEntity } from '../users/entity/users.entity';
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
    const normalizedEmail = email?.trim().toLowerCase();

    const token = uuidv4();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 48);

    const datosInvitacion: any = {
      token,
      establecimientoId,
      rol,
      expiracion,
    };

    if (normalizedEmail) {
      datosInvitacion.email = normalizedEmail;
    }

    if (normalizedEmail) {
      await this.invitacionRepo.manager.transaction(async (manager) => {
        // El lock por destinatario evita dos invitaciones simultáneas para el
        // mismo establecimiento sin depender del casing histórico del email.
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `invitacion:${establecimientoId}:${normalizedEmail}`,
        ]);
        const repo = manager.getRepository(InvitacionEntity);
        const pendiente = await repo.findOne({
          where: {
            email: Raw((alias) => `LOWER(TRIM(${alias})) = :email`, {
              email: normalizedEmail,
            }),
            establecimientoId,
            usado: false,
          },
        });
        if (pendiente) {
          throw new ConflictException(
            'Ya existe una invitación pendiente para ese email en este establecimiento',
          );
        }
        await repo.save(repo.create(datosInvitacion));
      });
    } else {
      await this.invitacionRepo.save(this.invitacionRepo.create(datosInvitacion));
    }

    let emailEnviado: string | null = null;
    let emailError: string | null = null;

    if (normalizedEmail) {
      try {
        const delivery = await this.mailService.sendMail({
          to: normalizedEmail,
          subject: '🐮 Invitación a Ternedata',
          html: `
            <h1>¡Hola!</h1>
            <p>Has sido invitado a colaborar en Ternedata.</p>
            <p>Tu rol será: <b>${rol}</b></p>
            <p>Haz clic aquí para aceptar:</p>
            <a href="${process.env.FRONTEND_URL}/join?token=${token}&email=${encodeURIComponent(normalizedEmail)}">Aceptar Invitación</a>
          `,
        });
        if (delivery?.rejected?.length) {
          throw new Error('SMTP rechazó al destinatario');
        }
        emailEnviado = normalizedEmail;
        this.logger.log(`Invitación enviada a ${normalizedEmail}`);
      } catch (error) {
        emailError = 'No se pudo enviar el correo';
        this.logger.error(`Error enviando invitación a ${normalizedEmail}`, error);
      }
    }

    const emailParam = normalizedEmail ? `&email=${encodeURIComponent(normalizedEmail)}` : '';
    return {
      link: `${process.env.FRONTEND_URL}/join?token=${token}${emailParam}`,
      token: token,
      emailEnviado,
      emailError,
    };
  }

  async getPendientes(establecimientoId: number): Promise<InvitacionEntity[]> {
    return this.invitacionRepo.find({
      where: { establecimientoId, usado: false },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async revocar(
    id: number,
    userId: number,
    adminEstId: number,
    adminEstIds: number[],
  ): Promise<{ message: string }> {
    const invitacion = await this.invitacionRepo.findOne({ where: { id } });
    if (!invitacion) {
      throw new HttpException('Invitación no encontrada', HttpStatus.NOT_FOUND);
    }
    // Camino barato (JWT) + fallback a DB para establecimientos
    // creados/asignados después de emitido el token.
    let tieneAcceso =
      adminEstId === invitacion.establecimientoId ||
      adminEstIds.includes(invitacion.establecimientoId);
    if (!tieneAcceso) {
      const enDb = await this.userEstablecimientoRepo.findOne({
        where: { userId, establecimientoId: invitacion.establecimientoId },
      });
      tieneAcceso = !!enDb;
    }
    if (!tieneAcceso) {
      throw new HttpException('No tenés acceso a esta invitación', HttpStatus.FORBIDDEN);
    }
    await this.invitacionRepo.remove(invitacion);
    return { message: 'Invitación revocada' };
  }

  // Acepta automáticamente todas las invitaciones pendientes para el email del usuario
  async aceptarPorEmail(userId: number): Promise<{ aceptadas: number }> {
    const user = await this.usersService.findOne(userId);
    if (!user?.email) return { aceptadas: 0 };
    const normalizedEmail = user.email.trim().toLowerCase();

    const invitaciones = await this.invitacionRepo.find({
      where: {
        email: Raw((alias) => `LOWER(TRIM(${alias})) = :email`, {
          email: normalizedEmail,
        }),
        usado: false,
      },
    });

    let aceptadas = 0;
    for (const inv of invitaciones) {
      if (new Date() > inv.expiracion) continue;
      try {
        await this.aceptarLink(inv.token, userId);
        aceptadas++;
      } catch (error) {
        if (error instanceof HttpException) {
          if (error.getStatus() === HttpStatus.CONFLICT) aceptadas++;
          if (
            error.getStatus() === HttpStatus.CONFLICT ||
            error.getStatus() === HttpStatus.BAD_REQUEST
          ) {
            continue;
          }
        }
        throw error;
      }
    }

    return { aceptadas };
  }

  async aceptarLink(token: string, userId: number) {
    const result = await this.invitacionRepo.manager.transaction(async (manager) => {
      const invitacionRepo = manager.getRepository(InvitacionEntity);
      const membresiaRepo = manager.getRepository(UserEstablecimientoEntity);
      const userRepo = manager.getRepository(UserEntity);

      const invitacion = await invitacionRepo.findOne({
        where: { token, usado: false },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitacion) {
        throw new HttpException('Link inválido o ya usado', HttpStatus.BAD_REQUEST);
      }
      if (new Date() > invitacion.expiracion) {
        throw new HttpException('Link expirado', HttpStatus.BAD_REQUEST);
      }

      // Bloquea también al usuario: serializa invitaciones diferentes que apunten
      // al mismo establecimiento y evita crear dos membresías concurrentes.
      const user = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (invitacion.email) {
        const mismoEmail =
          user?.email?.trim().toLowerCase() === invitacion.email.trim().toLowerCase();
        if (!mismoEmail) {
          throw new HttpException(
            'Esta invitación es para otro email. Iniciá sesión con la cuenta invitada.',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      const existe = await membresiaRepo.findOne({
        where: { userId, establecimientoId: invitacion.establecimientoId },
      });
      if (existe) {
        await invitacionRepo.update(invitacion.id, { usado: true });
        return { alreadyMember: true, establecimientoId: invitacion.establecimientoId };
      }

      await membresiaRepo.save({
        userId,
        establecimientoId: invitacion.establecimientoId,
        rol: invitacion.rol,
      });
      await invitacionRepo.update(invitacion.id, { usado: true });
      await userRepo.update(userId, { id_establecimiento: invitacion.establecimientoId });
      return { alreadyMember: false, establecimientoId: invitacion.establecimientoId };
    });

    if (result.alreadyMember) {
      throw new HttpException('Ya eres parte de este equipo', HttpStatus.CONFLICT);
    }
    return {
      message: '¡Te has unido al equipo exitosamente!',
      establecimientoId: result.establecimientoId,
    };
  }
}
