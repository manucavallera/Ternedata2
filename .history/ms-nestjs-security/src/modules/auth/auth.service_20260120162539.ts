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
  // REGISTER CON LOGS DETALLADOS (Para que veas si el token entra)
  // =================================================================
  async register(registerAuthDto: RegisterAuthDto) {
    let estadoInicial = 'inactivo';
    let datosInvitacion = null;

    if (invitationToken) {
      try {
        // 👇👇👇 AQUÍ ESTÁ EL TRUCO (LA LAVADORA) 👇👇👇
        // 1. .trim() -> Borra espacios en blanco al inicio y final
        // 2. .replace(...) -> Borra comillas simples ' o dobles " que se hayan copiado sin querer
        const tokenLimpio = invitationToken.trim().replace(/['"]+/g, '');

        console.log('🧼 [SERVICE] Token Limpio:', tokenLimpio);

        // Verificamos el token YA LIMPIO
        datosInvitacion = this.jwtService.verify(tokenLimpio);

        estadoInicial = 'activo';
        console.log(
          '✅ [SERVICE] Token Válido. ID Granja:',
          datosInvitacion.id_establecimiento,
        );
      } catch (error) {
        console.error('❌ [SERVICE] Token Inválido:', error.message);
        console.error(
          '🔍 [DEBUG] El token sucio que llegó fue:',
          invitationToken,
        );
      }
    }
    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: estadoInicial,
      rol: 'operario',
      id_establecimiento: null,
    };

    const newUser = await this.usersRepository.save(userObject);

    // VINCULACIÓN
    if (datosInvitacion) {
      try {
        await this.userEstablecimientoRepository.save({
          userId: newUser.id,
          establecimientoId: datosInvitacion.id_establecimiento,
          rol: datosInvitacion.rol || 'veterinario',
        });
        console.log('🔗 [SERVICE] Usuario vinculado a la granja exitosamente.');
      } catch (err) {
        console.error('❌ [SERVICE] Falló la vinculación en BD:', err);
      }
    }

    return newUser;
  }

  // ... (LOGIN DÉJALO IGUAL) ...
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

  // 👇 VERSIÓN DINÁMICA (Copia esto exacto)
  crearTokenMagico(emailRecibido: string) {
    const payload = {
      email: emailRecibido, // 👈 USA EL EMAIL QUE LE PASAS
      id_establecimiento: 10,
      rol: 'veterinario',
    };

    const token = this.jwtService.sign(payload);

    return {
      instruccion: `Token creado para: ${emailRecibido}`,
      token_para_copiar: token,
    };
  }
}
