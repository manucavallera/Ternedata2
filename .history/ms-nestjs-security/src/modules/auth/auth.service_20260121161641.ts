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

    let estadoInicial = 'inactivo';
    let datosInvitacion = null;

    if (invitationToken) {
      try {
        const tokenLimpio = invitationToken.trim().replace(/['"]+/g, '');
        datosInvitacion = this.jwtService.verify(tokenLimpio);
        estadoInicial = 'activo';
        console.log('✅ [SERVICE] Token Válido. Rol:', datosInvitacion.rol);
      } catch (error) {
        console.error('❌ [SERVICE] Token Inválido:', error.message);
      }
    }

    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: estadoInicial,
      rol: datosInvitacion?.rol || 'operario',
      id_establecimiento: datosInvitacion?.id_establecimiento || null,
    };

    const newUser = await this.usersRepository.save(userObject);

    if (datosInvitacion) {
      try {
        await this.userEstablecimientoRepository.save({
          userId: newUser.id,
          establecimientoId: datosInvitacion.id_establecimiento,
          rol: datosInvitacion.rol || 'operario',
        });
        console.log('🔗 [SERVICE] Vinculado con éxito.');
      } catch (err) {
        console.error('❌ Falló vinculación:', err);
      }
    }
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
    // 1. Generamos el Token
    const payload = {
      email: emailRecibido,
      id_establecimiento: idEstablecimiento || null,
      rol: rolRecibido,
    };
    const token = this.jwtService.sign(payload);

    // 2. Construimos el Link (Asegúrate que este puerto coincida con tu Frontend)
    const linkDeRegistro = `http://localhost:3002/register?token=${token}`;

    // 3. 👇 CONFIGURACIÓN DEL CARTERO (NODEMAILER)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'manucavallera44@gmail.com', // Tu email real
        pass: 'zswe bmll xoxd qftf', // 🔐 Tu contraseña de aplicación
      },
    });

    // 4. 👇 DISEÑO DEL CORREO
    const mailOptions = {
      from: '"Ternedata App 🐮" <manucavallera44@gmail.com>',
      to: emailRecibido, // Le enviamos el correo al invitado
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

    // 5. 👇 ENVIAR EL CORREO (Disparamos y nos olvidamos)
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Email enviado exitosamente a ${emailRecibido}`);
    } catch (error) {
      console.error('❌ Error enviando email:', error);
      // No lanzamos error para no romper el flujo, pero avisamos en consola
    }

    // Retornamos el token igual que antes para que el frontend siga funcionando
    return {
      instruccion: `Email enviado a ${emailRecibido}`,
      token_para_copiar: token,
    };
  }
}
