import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

@Injectable()
export class AuthService {
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
    const { name, email, password, invitationToken } = registerAuthDto;

    console.log(`📨 [SERVICE] Registrando: ${email}`);

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

    const passwordHash = await hash(password, 10);

    // Users always register as active.
    // The invitation token (UUID) is processed by the business service after login.
    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: 'activo',
      rol: 'operario',
      id_establecimiento: null,
    };

    const newUser = await this.usersRepository.save(userObject);
    return newUser;
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

    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
      userEstablecimientos: user.userEstablecimientos || [],
    };

    const token = this.jwtService.sign(payload, { expiresIn: '30d' });
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
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
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
      console.log(`📧 Email enviado exitosamente a ${emailRecibido}`);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
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

    const payload = { id: user.id, email: user.email, type: 'reset' };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });
    const link = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
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
      console.error('❌ Error enviando email de reset:', error);
    }

    return { message: 'Si el email existe, recibirás un correo en breve.' };
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

      const passwordHash = await hash(newPassword, 10);
      await this.usersRepository.update(user.id, { password: passwordHash });

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
