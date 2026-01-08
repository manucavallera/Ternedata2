// ms-nestjs-security/src/modules/users/users.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserEntity, UserRole, UserStatus } from './entity/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  // ===== MÉTODOS EXISTENTES (mejorados) =====

  // Obtener todos los usuarios (sin mostrar contraseña)
  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: [
        'id',
        'name',
        'email',
        'rol',
        'estado',
        'telefono',
        'id_establecimiento', // 🆕 AGREGADO
        'fecha_creacion',
        'ultimo_acceso',
      ],
      order: { fecha_creacion: 'DESC' },
    });
  }

  // Obtener un usuario por ID
  async findOne(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'rol',
        'estado',
        'telefono',
        'id_establecimiento', // 🆕 AGREGADO
        'permisos_especiales',
        'fecha_creacion',
        'ultimo_acceso',
      ],
    });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  // Obtener usuario por email (para login) - incluye password
  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  // Actualizar un usuario por ID
  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    // Verificar si el email ya existe (si se está cambiando)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    // Si se actualiza la contraseña, hashearla
    if (updateUserDto.password) {
      const saltOrRounds = 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltOrRounds,
      );
    } else {
      // Si no se envía password, no actualizar ese campo
      delete updateUserDto.password;
    }

    await this.usersRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  // Eliminar usuario (soft delete - cambiar a inactivo)
  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);

    // Cambiar estado a inactivo en lugar de eliminar
    await this.usersRepository.update(id, {
      estado: 'inactivo',
    });

    return { message: 'Usuario desactivado correctamente' };
  }

  // ===== NUEVOS MÉTODOS PARA PANEL ADMIN =====

  // Crear usuario (para el panel admin)
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Verificar si el email ya existe
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Hashear la contraseña
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds,
    );

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    // 🆕 LOG: Ver datos del usuario creado
    console.log('👤 Creando usuario con:', {
      name: newUser.name,
      email: newUser.email,
      rol: newUser.rol,
      id_establecimiento: newUser.id_establecimiento,
    });

    return await this.usersRepository.save(newUser);
  }

  // Actualizar último acceso
  async updateLastAccess(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      ultimo_acceso: new Date(),
    });
  }

  // Cambiar rol de usuario
  async changeRole(id: number, newRole: UserRole): Promise<UserEntity> {
    await this.usersRepository.update(id, { rol: newRole });
    return await this.findOne(id);
  }

  // Activar/Desactivar usuario
  async toggleStatus(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';

    await this.usersRepository.update(id, { estado: newStatus });
    return await this.findOne(id);
  }

  // Obtener estadísticas de usuarios (para dashboard admin)
  async getStats() {
    const [total, activos, inactivos] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { estado: 'activo' } }),
      this.usersRepository.count({ where: { estado: 'inactivo' } }),
    ]);

    const porRol = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.rol', 'rol')
      .addSelect('COUNT(*)', 'cantidad')
      .where('user.estado = :estado', { estado: 'activo' })
      .groupBy('user.rol')
      .getRawMany();

    return {
      total,
      activos,
      inactivos,
      por_rol: porRol,
    };
  }

  // Obtener usuarios por rol
  async findByRole(role: UserRole): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { rol: role, estado: 'activo' },
      select: [
        'id',
        'name',
        'email',
        'rol',
        'telefono',
        'id_establecimiento', // 🆕 AGREGADO
        'fecha_creacion',
      ],
    });
  }

  // 🆕 NUEVO MÉTODO: Obtener usuarios por establecimiento
  async findByEstablecimiento(
    idEstablecimiento: number,
  ): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { id_establecimiento: idEstablecimiento },
      select: [
        'id',
        'name',
        'email',
        'rol',
        'estado',
        'telefono',
        'fecha_creacion',
        'ultimo_acceso',
      ],
      order: { fecha_creacion: 'DESC' },
    });
  }
}
