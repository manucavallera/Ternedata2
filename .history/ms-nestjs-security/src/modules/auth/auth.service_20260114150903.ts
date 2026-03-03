// ms-nestjs-security/src/modules/auth/auth.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register.dto';
import { hash, compare } from 'bcrypt';
import { LoginAuthDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { UserInterface } from './interface/user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerAuthDto: RegisterAuthDto) {
    // 👇 1. Extraemos también el 'invitationToken' del DTO
    const { name, email, password, invitationToken } = registerAuthDto;

    if (!email || !name || !password) {
      throw new HttpException(
        'Faltan datos obligatorios',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar si el email ya existe
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

    // 👇 2. LÓGICA DE AUTO-ACTIVACIÓN
    // Si trae token, nace 'activo'. Si no, nace 'inactivo'.
    let estadoInicial = 'inactivo';

    if (invitationToken) {
      console.log(
        `🎟️ Token detectado (${invitationToken}). Activando usuario automáticamente...`,
      );
      estadoInicial = 'activo';
    }

    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: estadoInicial, // 👈 Usamos la variable calculada
      rol: 'operario',
      id_establecimiento: null,
    };

    console.log('📝 Nuevo registro:', {
      email: userObject.email,
      estado: userObject.estado, // Verificamos en consola cómo quedó
    });

    return await this.usersRepository.save(userObject);
  }

  async login(loginAuthDto: LoginAuthDto): Promise<UserInterface> {
    const { email, password } = loginAuthDto;
    const user = await this.usersRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.UNAUTHORIZED);
    }

    // Verificar si el usuario está activo
    if (user.estado === 'inactivo') {
      throw new HttpException(
        'Usuario inactivo. Contacte al administrador.',
        HttpStatus.FORBIDDEN,
      );
    }

    // 🆕 LOG 1: Ver datos del usuario desde la BD
    console.log('\n' + '='.repeat(60));
    console.log('👤 [SECURITY] USUARIO DESDE BD:');
    console.log('='.repeat(60));
    console.log('ID:', user.id);
    console.log('Nombre:', user.name);
    console.log('Email:', user.email);
    console.log('Rol:', user.rol);
    console.log('ID Establecimiento:', user.id_establecimiento);
    console.log('Estado:', user.estado);
    console.log('='.repeat(60) + '\n');

    const passwordValid = await compare(password, user.password);

    if (!passwordValid) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

    // ⭐ PAYLOAD JWT: Incluir rol e id_establecimiento
    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
    };

    // 🆕 LOG 2: Ver el payload que se va a firmar
    console.log('📦 [SECURITY] PAYLOAD JWT:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('='.repeat(60) + '\n');

    const token = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    // 🆕 LOG 3: Token generado
    console.log('🔑 [SECURITY] TOKEN GENERADO:');
    console.log(token.substring(0, 50) + '...');
    console.log('='.repeat(60) + '\n');

    const userToken: UserInterface = {
      user: user,
      token: token,
    };

    return userToken;
  }
}
