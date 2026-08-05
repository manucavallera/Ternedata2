import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register.dto';
import { hash, compare } from 'bcrypt';
import { LoginAuthDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserInterface } from './interface/user.interface';
import { UserEstablecimientoEntity } from 'src/modules/users/entity/user-establecimiento.entity';
// 👇 1. IMPORTAMOS NODEMAILER
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
    private readonly jwtService: JwtService,
  ) {}

  // =================================================================
  // REGISTER (Sin cambios, sigue igual de bien)
  // =================================================================
  async register(registerAuthDto: RegisterAuthDto) {
    const { name, email, password, invitationToken, platform } = registerAuthDto;
    const telefono = (registerAuthDto as any).telefono;


    if (!email || !name || !password) {
      throw new HttpException(
        'Faltan datos obligatorios',
        HttpStatus.BAD_REQUEST,
      );
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new HttpException(
        'El email ya está registrado',
        HttpStatus.CONFLICT,
      );
    }

    if (telefono) {
      const existingPhone = await this.usersRepository.findOne({
        where: { telefono },
      });
      if (existingPhone) {
        throw new HttpException(
          'El teléfono ya está registrado por otro usuario',
          HttpStatus.CONFLICT,
        );
      }
    }

    const passwordHash = await hash(password, 10);

    // Sin invitación → admin (crea su propio establecimiento)
    // Con invitación → operario (será asignado al establecimiento del admin)
    const rol = invitationToken ? 'operario' : 'admin';

    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: 'activo',
      rol,
      id_establecimiento: null,
      ...(telefono ? { telefono } : {}),
      email_verificado: false, // hasta que confirme por mail
    };

    const newUser = await this.usersRepository.save(userObject);

    // Enviar mail de verificación (no bloquea el registro si el mail falla)
    await this.enviarMailVerificacion(
      newUser.id,
      newUser.email,
      newUser.name,
      platform,
    );

    return {
      message:
        'Registro exitoso. Te enviamos un email para verificar tu cuenta. Revisá tu casilla (y spam).',
      email: newUser.email,
    };
  }

  // =================================================================
  // VERIFICACIÓN DE EMAIL
  // =================================================================
  private async enviarMailVerificacion(
    userId: number,
    email: string,
    nombre: string,
    platform?: 'web' | 'mobile',
  ): Promise<void> {
    const token = this.jwtService.sign(
      { id: userId, email, type: 'verify' },
      { expiresIn: '24h' },
    );
    const link = `${this.obtenerUrlFrontend(platform)}/auth/verify-email?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        // Gmail suele mostrar las contraseñas de aplicación separadas por
        // espacios; SMTP necesita los 16 caracteres continuos.
        pass: process.env.MAIL_PASS?.replace(/\s/g, ''),
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    try {
      await transporter.sendMail({
        from: `"Ternedata App 🐮" <${process.env.MAIL_USER}>`,
        to: email,
        subject: '✅ Verificá tu cuenta - Ternedata',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4F46E5;">¡Bienvenido a Ternedata!</h2>
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Confirmá tu email para activar la cuenta:</p>
            <a href="${link}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
              Verificar mi cuenta
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">Este link expira en 24 horas. Si no creaste esta cuenta, ignorá este email.</p>
          </div>
        `,
      });
      this.logger.log(`Mail de verificación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error enviando verificación a ${email}`, error);
    }
  }

  private obtenerUrlFrontend(platform?: 'web' | 'mobile'): string {
    const url =
      platform === 'web'
        ? process.env.WEB_FRONTEND_URL
        : platform === 'mobile'
          ? process.env.MOBILE_FRONTEND_URL
          : process.env.FRONTEND_URL;

    return (url || process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new HttpException(
        'Link inválido o expirado. Pedí uno nuevo.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (payload.type !== 'verify') {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.id },
    });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    if (user.email_verificado) {
      return { message: 'Tu cuenta ya estaba verificada. Podés iniciar sesión.' };
    }

    await this.usersRepository.update(user.id, { email_verificado: true });
    return { message: 'Email verificado. Ya podés iniciar sesión.' };
  }

  async resendVerification(
    email: string,
    platform?: 'web' | 'mobile',
  ): Promise<{ message: string }> {
    const msgGenerico = {
      message: 'Si la cuenta existe y no está verificada, te enviamos un nuevo email.',
    };
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user || user.email_verificado) {
      return msgGenerico; // no revelamos si existe ni su estado
    }
    await this.enviarMailVerificacion(user.id, user.email, user.name, platform);
    return msgGenerico;
  }

  // =================================================================
  // LOGIN (Sin cambios)
  // =================================================================
  async login(loginAuthDto: LoginAuthDto): Promise<UserInterface> {
    const { email, password } = loginAuthDto;
    const user = await this.usersRepository.findOne({
      where: { email: email },
      relations: ['userEstablecimientos'],
    });

    if (!user)
      throw new HttpException('Usuario no encontrado', HttpStatus.UNAUTHORIZED);
    if (user.estado === 'inactivo')
      throw new HttpException('Usuario inactivo.', HttpStatus.FORBIDDEN);

    const passwordValid = await compare(password, user.password);
    if (!passwordValid)
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);

    if (user.email_verificado === false)
      throw new HttpException(
        'Verificá tu email antes de entrar. Te enviamos un correo al registrarte.',
        HttpStatus.FORBIDDEN,
      );

    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
      userEstablecimientos: user.userEstablecimientos || [],
    };

    const token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { user, token };
  }

  // =================================================================
  // GENERADOR DE TOKEN + ENVÍO DE EMAIL 📧
  // =================================================================
  async crearTokenMagico(
    emailRecibido: string,
    rolRecibido: string,
    idEstablecimiento: number,
  ) {
    const payload = {
      email: emailRecibido,
      id_establecimiento: idEstablecimiento || null,
      rol: rolRecibido,
    };
    const token = this.jwtService.sign(payload);

    const linkDeRegistro = `${process.env.FRONTEND_URL}/auth/register?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS?.replace(/\s/g, ''),
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    const mailOptions = {
      from: `"Ternedata App 🐮" <${process.env.MAIL_USER}>`,
      to: emailRecibido,
      subject: '🎟️ Invitación a Ternedata',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #4F46E5;">¡Has sido invitado a Ternedata!</h2>
          <p>Hola,</p>
          <p>Te han invitado a unirte al equipo como <strong>${rolRecibido.toUpperCase()}</strong>.</p>
          <p>Haz clic en el botón de abajo para registrarte y activar tu cuenta:</p>
          <a href="${linkDeRegistro}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
            Aceptar Invitación
          </a>
          <p style="margin-top: 20px; font-size: 12px; color: #888;">Si el botón no funciona, copia este link: <br> ${linkDeRegistro}</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      this.logger.log(`Email enviado a ${emailRecibido}`);
    } catch (error) {
      this.logger.error('Error enviando email', error);
    }

    return {
      instruccion: `Email enviado a ${emailRecibido}`,
      token_para_copiar: token,
    };
  }

  // =================================================================
  // FORGOT PASSWORD - Enviar email de recuperación
  // =================================================================
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { email } });

    // No revelamos si el usuario existe o no
    if (!user) {
      return { message: 'Si el email existe, recibirás un correo en breve.' };
    }

    const jti = uuidv4();
    await this.usersRepository.update(user.id, { password_reset_jti: jti });
    const payload = { id: user.id, email: user.email, type: 'reset', jti };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });
    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS?.replace(/\s/g, ''),
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    try {
      await transporter.sendMail({
        from: `"Ternedata App 🐮" <${process.env.MAIL_USER}>`,
        to: email,
        subject: '🔐 Recuperar contraseña - Ternedata',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4F46E5;">Recuperar contraseña</h2>
            <p>Hola <strong>${user.name}</strong>,</p>
            <p>Recibimos una solicitud para resetear tu contraseña. Haz clic en el botón:</p>
            <a href="${link}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">
              Resetear contraseña
            </a>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">Este link expira en 1 hora. Si no solicitaste esto, ignorá este email.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error('Error enviando email de reset', error);
    }

    return { message: 'Si el email existe, recibirás un correo en breve.' };
  }

  // =================================================================
  // REFRESH TOKEN - Genera un nuevo JWT con datos frescos de DB
  // =================================================================
  async refreshToken(userId: number): Promise<UserInterface> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['userEstablecimientos'],
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.UNAUTHORIZED);
    }
    if (user.estado === 'inactivo') {
      throw new HttpException('Usuario inactivo.', HttpStatus.FORBIDDEN);
    }

    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
      userEstablecimientos: user.userEstablecimientos || [],
    };

    const token = this.jwtService.sign(payload, { expiresIn: '7d' });
    return { user, token };
  }

  // =================================================================
  // RESET PASSWORD - Cambiar contraseña con token
  // =================================================================
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(token) as any;

      if (payload.type !== 'reset') {
        throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
      }

      const user = await this.usersRepository.findOne({
        where: { id: payload.id },
      });
      if (!user) {
        throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
      }

      // Verificar que el jti coincida (un solo uso)
      if (!payload.jti || user.password_reset_jti !== payload.jti) {
        throw new HttpException('Token ya usado o inválido', HttpStatus.BAD_REQUEST);
      }

      const passwordHash = await hash(newPassword, 10);
      // Limpiar jti para invalidar este token de reset
      await this.usersRepository.update(user.id, {
        password: passwordHash,
        password_reset_jti: null,
      });

      return { message: 'Contraseña actualizada correctamente.' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        'Token inválido o expirado',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
