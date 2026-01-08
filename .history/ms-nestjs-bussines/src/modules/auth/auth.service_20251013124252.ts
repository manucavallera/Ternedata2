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
    const { name, email, password } = registerAuthDto;

    if (email && name && password) {
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

      if (passwordHash) {
        const userObject = {
          name: name,
          email: email,
          password: passwordHash,
          // rol y estado se asignan automáticamente por defecto en la entidad
        };

        return await this.usersRepository.save(userObject);
      } else {
        throw new HttpException(
          'Error al generar el hash de la contraseña',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
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

    const passwordValid = await compare(password, user.password);

    if (!passwordValid) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

    // IMPORTANTE: Incluir el rol en el payload del JWT
    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol, // ⬅️ NUEVO: incluir rol en el token
    };

    const token = this.jwtService.sign(payload);

    // Actualizar último acceso (opcional)
    await this.usersRepository.update(user.id, {
      ultimo_acceso: new Date(),
    });

    const userToken: UserInterface = {
      user: user,
      token: token,
    };

    return userToken;
  }
}
