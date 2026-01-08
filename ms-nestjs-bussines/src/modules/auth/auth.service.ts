// ms-nestjs-business/src/modules/auth/auth.service.ts
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

    // 🆕 LOG 1: Ver datos del usuario desde la BD
    console.log('\n' + '='.repeat(60));
    console.log('👤 USUARIO DESDE BD:');
    console.log('='.repeat(60));
    console.log('ID:', user.id);
    console.log('Nombre:', user.name);
    console.log('Email:', user.email);
    console.log('Rol:', user.rol);
    console.log('ID Establecimiento:', user.id_establecimiento); // ⬅️ IMPORTANTE
    console.log('Estado:', user.estado);
    console.log('='.repeat(60) + '\n');

    // ⭐ PAYLOAD JWT: Incluir rol e id_establecimiento
    const payload = {
      id: user.id,
      name: user.name,
      rol: user.rol,
      id_establecimiento: user.id_establecimiento, // 🆕 AGREGADO
    };

    // 🆕 LOG 2: Ver el payload que se va a firmar
    console.log('📦 PAYLOAD JWT (antes de firmar):');
    console.log(JSON.stringify(payload, null, 2));
    console.log('='.repeat(60) + '\n');

    const token = this.jwtService.sign(payload);

    // 🆕 LOG 3: Ver el token generado
    console.log('🔑 TOKEN GENERADO:');
    console.log(token);
    console.log('='.repeat(60) + '\n');

    // Actualizar último acceso (opcional)
    await this.usersRepository.update(user.id, {
      ultimo_acceso: new Date(),
    });

    const userToken: UserInterface = {
      user: user,
      token: token,
    };

    // 🆕 LOG 4: Ver la respuesta completa
    console.log('✅ RESPUESTA FINAL (con user y token):');
    console.log('User ID:', userToken.user.id);
    console.log('User Name:', userToken.user.name);
    console.log('User Rol:', userToken.user.rol);
    console.log('User Establecimiento:', userToken.user['id_establecimiento']); // ⬅️ IMPORTANTE
    console.log(
      'Token (primeros 50 chars):',
      userToken.token.substring(0, 50) + '...',
    );
    console.log('='.repeat(60) + '\n');

    return userToken;
  }
}
