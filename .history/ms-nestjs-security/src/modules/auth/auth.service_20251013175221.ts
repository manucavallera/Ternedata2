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
    if (email && email && password) {
      const passwordHash = await hash(password, 10);
      if (passwordHash) {
        const userObeject = {
          name: name,
          email: email,
          password: passwordHash,
        };
        return await this.usersRepository.save(userObeject);
      } else {
        return new HttpException(
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
    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      throw new HttpException('Contraseña incorrecta', HttpStatus.UNAUTHORIZED);
    }

    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol, // ⬅️ AGREGAR ESTA LÍNEA
    };
    const token = this.jwtService.sign(payload);
    var userToken: UserInterface = {
      user: user,
      token: token,
    };

    return userToken;
  }
}
