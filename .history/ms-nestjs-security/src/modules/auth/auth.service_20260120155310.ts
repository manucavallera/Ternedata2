import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register.dto';
import { hash, compare } from 'bcrypt';
import { LoginAuthDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserInterface } from './interface/user.interface';
// 👇 1. ESTO FALTABA (Importar la entidad de relación)
import { UserEstablecimientoEntity } from 'src/modules/users/entity/user-establecimiento.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    // 👇 2. ESTO FALTABA (Inyectar el repositorio)
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
    private readonly jwtService: JwtService,
  ) {}

  // =================================================================
  // REGISTER (Corregido para vincular granja)
  // =================================================================
  async register(registerAuthDto: RegisterAuthDto) {
    const { name, email, password, invitationToken } = registerAuthDto;

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

    // LÓGICA DE ACTIVACIÓN
    let estadoInicial = 'inactivo';
    let datosInvitacion = null;

    if (invitationToken) {
      try {
        // 👇 3. ESTO FALTABA (Leer el token para sacar ID granja y Rol)
        datosInvitacion = this.jwtService.verify(invitationToken);
        estadoInicial = 'activo';
      } catch (error) {
        throw new HttpException(
          'Token de invitación inválido',
          HttpStatus.BAD_REQUEST,
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

    // 👇 4. ESTO FALTABA (Crear la relación en la BD)
    if (datosInvitacion) {
      await this.userEstablecimientoRepository.save({
        userId: newUser.id,
        // Asegúrate de que tu token de invitación tenga estos campos
        establecimientoId: datosInvitacion.id_establecimiento,
        rol: datosInvitacion.rol || 'veterinario',
      });
    }

    return newUser;
  }

  // =================================================================
  // LOGIN (Este ya estaba bien en tu archivo, lo dejo igual)
  // =================================================================
  async login(loginAuthDto: LoginAuthDto): Promise<UserInterface> {
    const { email, password } = loginAuthDto;

    const user = await this.usersRepository.findOne({
      where: { email: email },
      relations: ['userEstablecimientos'],
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.UNAUTHORIZED);
    }

    if (user.estado === 'inactivo') {
      throw new HttpException('Usuario inactivo.', HttpStatus.FORBIDDEN);
    }

    const passwordValid = await compare(password, user.password);

    if (!passwordValid) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

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
  // 👇 GENERADOR DE TOKENS PARA PRUEBAS
  crearTokenMagico() {
    const payload = {
      email: 'veterinario_final@gmail.com', // El email que usarás en el registro
      id_establecimiento: 10, // El ID de tu granja (asegúrate que exista)
      rol: 'veterinario',
    };

    // Esto firma el token con TU clave secreta real del .env
    const token = this.jwtService.sign(payload);

    return {
      token_para_copiar: token,
    };
  }
}
