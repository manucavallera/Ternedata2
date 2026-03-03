import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/modules/users/entity/users.entity';
import { Repository } from 'typeorm';
import { RegisterAuthDto } from './dto/register.dto';
import { hash, compare } from 'bcrypt'; // Asegúrate de tener bcrypt instalado
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
  // REGISTER ARREGLADO
  // =================================================================
  async register(registerAuthDto: RegisterAuthDto) {
    // 👇 ESTO FALTABA: Sacar las variables del paquete que envía el frontend
    const { name, email, password, invitationToken } = registerAuthDto;

    console.log(`📨 [SERVICE] Registrando: ${email}`);

    // Validaciones básicas
    if (!email || !name || !password) {
      throw new HttpException(
        'Faltan datos obligatorios',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Verificar si ya existe
    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new HttpException(
        'El email ya está registrado',
        HttpStatus.CONFLICT,
      );
    }

    // Hashear contraseña
    const passwordHash = await hash(password, 10);

    // LÓGICA DE ACTIVACIÓN (Aquí empieza tu código de "Lavadora")
    let estadoInicial = 'inactivo';
    let datosInvitacion = null;

    if (invitationToken) {
      try {
        // 🧼 LAVADORA DE TOKENS
        const tokenLimpio = invitationToken.trim().replace(/['"]+/g, '');
        console.log('🧼 [SERVICE] Token Limpio:', tokenLimpio);

        // Verificar
        datosInvitacion = this.jwtService.verify(tokenLimpio);

        estadoInicial = 'activo';
        console.log(
          '✅ [SERVICE] Token Válido. ID Granja:',
          datosInvitacion.id_establecimiento,
        );
      } catch (error) {
        console.error('❌ [SERVICE] Token Inválido:', error.message);
      }
    }

    // Guardar Usuario
    const userObject = {
      name: name,
      email: email,
      password: passwordHash,
      estado: estadoInicial,
      rol: 'operario',
      id_establecimiento: null,
    };

    const newUser = await this.usersRepository.save(userObject);

    // VINCULACIÓN A GRANJA
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

  // =================================================================
  // LOGIN (Igual que antes)
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
  // GENERADOR DE TOKEN (Dinámico)
  // =================================================================
  crearTokenMagico(emailRecibido: string) {
    const payload = {
      email: emailRecibido,
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
