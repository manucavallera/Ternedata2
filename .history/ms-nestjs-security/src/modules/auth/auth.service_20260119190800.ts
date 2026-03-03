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
    const { name, email, password, invitationToken } = registerAuthDto;

    // Validación básica de campos
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

    // LÓGICA DE AUTO-ACTIVACIÓN
    let estadoInicial = 'inactivo';
    if (invitationToken) {
      estadoInicial = 'activo';
    }

    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: estadoInicial,
      rol: 'operario',
      id_establecimiento: null,
    };

    return await this.usersRepository.save(userObject);
  }

  async login(loginAuthDto: LoginAuthDto): Promise<UserInterface> {
    const { email, password } = loginAuthDto;

    // 👇 CORREGIDO 1: Pedimos las relaciones (userEstablecimientos)
    const user = await this.usersRepository.findOne({
      where: { email: email },
      relations: ['userEstablecimientos'],
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

    const passwordValid = await compare(password, user.password);

    if (!passwordValid) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

    // ⭐ CORREGIDO 2: Agregamos la lista al Token
    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento,
      // 👇 ¡ESTO ES LO QUE FALTABA!
      userEstablecimientos: user.userEstablecimientos || [],
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '30d',
    });

    const userToken: UserInterface = {
      user: user,
      token: token,
    };

    return userToken;
  }
}
