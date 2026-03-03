// ms-nestjs-security/src/modules/users/users.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserEntity, UserRole } from './entity/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  // ===== MÉTODOS MODIFICADOS PARA MULTI-TENANCY =====

  // 👇 AHORA RECIBE 'currentUser' y filtra correctamente
  async findAll(currentUser: any): Promise<UserEntity[]> {
    // 👑 CASO 1: SUPER ADMIN (Ve todo el universo)
    // Usamos TU ID (2) para asegurarnos de que veas todo
    const esSuperAdmin =
      currentUser.rol === 'super_admin' || currentUser.userId === 2; // 👈 Corrección clave: ID en vez de email

    if (esSuperAdmin) {
      return this.usersRepository.find({
        select: [
          'id',
          'name',
          'email',
          'rol',
          'estado',
          'telefono',
          'id_establecimiento',
          'fecha_creacion',
          'ultimo_acceso',
        ],
        order: { fecha_creacion: 'DESC' },
      });
    }

    // 🚜 CASO 2: ADMIN DE ESTABLECIMIENTO / VETERINARIO (Ve solo su granja)
    if (currentUser.rol === 'admin' || currentUser.rol === 'veterinario') {
      // Si el usuario no tiene establecimiento asignado, no ve nada
      if (!currentUser.id_establecimiento) {
        return [];
      }

      return this.usersRepository.find({
        where: {
          id_establecimiento: currentUser.id_establecimiento,
        },
        select: [
          'id',
          'name',
          'email',
          'rol',
          'estado',
          'telefono',
          'id_establecimiento',
          'fecha_creacion',
          'ultimo_acceso',
        ],
        order: { fecha_creacion: 'DESC' },
      });
    }

    // 👷 CASO 3: OPERARIO (No ve nada)
    return [];
  }

  // ===== RESTO DE MÉTODOS (SIN CAMBIOS) =====

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
        'id_establecimiento',
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

  async findByEmail(email: string): Promise<UserEntity | undefined> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateUserDto.password) {
      const saltOrRounds = 10;
      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        saltOrRounds,
      );
    } else {
      delete updateUserDto.password;
    }

    await this.usersRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.usersRepository.update(id, {
      estado: 'inactivo',
    });
    return { message: 'Usuario desactivado correctamente' };
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds,
    );

    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return await this.usersRepository.save(newUser);
  }

  async updateLastAccess(id: number): Promise<void> {
    await this.usersRepository.update(id, {
      ultimo_acceso: new Date(),
    });
  }

  async changeRole(id: number, newRole: UserRole): Promise<UserEntity> {
    await this.usersRepository.update(id, { rol: newRole });
    return await this.findOne(id);
  }

  async toggleStatus(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';

    await this.usersRepository.update(id, { estado: newStatus });
    return await this.findOne(id);
  }

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

  async findByRole(role: UserRole): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { rol: role, estado: 'activo' },
      select: [
        'id',
        'name',
        'email',
        'rol',
        'telefono',
        'id_establecimiento',
        'fecha_creacion',
      ],
    });
  }

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
