import {
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { UserEntity, UserRole, UserStatus } from './entity/users.entity';
import { UserEstablecimientoEntity } from './entity/user-establecimiento.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { RolEstablecimientoService } from '../auth/rol-establecimiento.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstRepo: Repository<UserEstablecimientoEntity>,
    private readonly rolEstablecimiento: RolEstablecimientoService,
  ) {}

  // ===== MÉTODOS EXISTENTES (mejorados) =====

  // Obtener todos los usuarios (sin mostrar contraseña)
  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      relations: ['establecimientosAsignados'],
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
  async update(id: number, updateUserDto: any): Promise<UserEntity> {
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

    if (updateUserDto.telefono && updateUserDto.telefono !== user.telefono) {
      const existingPhone = await this.usersRepository.findOne({
        where: { telefono: updateUserDto.telefono },
      });
      if (existingPhone) {
        throw new ConflictException('El teléfono ya está registrado por otro usuario');
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
    const _user = await this.findOne(id);

    // Cambiar estado a inactivo en lugar de eliminar
    await this.usersRepository.update(id, {
      estado: UserStatus.INACTIVO,
    });

    return { message: 'Usuario desactivado correctamente' };
  }

  // Eliminar permanentemente (solo para casos especiales)
  async removeForever(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    await this.usersRepository.remove(user);
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

    // El teléfono es único: vacío se guarda como null para no chocar entre usuarios sin teléfono
    const telefono = createUserDto.telefono?.trim() || null;
    if (telefono) {
      const existingPhone = await this.usersRepository.findOne({
        where: { telefono },
      });
      if (existingPhone) {
        throw new ConflictException('El teléfono ya está registrado por otro usuario');
      }
    }

    // Hashear la contraseña
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds,
    );

    const newUser = this.usersRepository.create({
      ...createUserDto,
      telefono,
      password: hashedPassword,
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
    const newStatus =
      user.estado === UserStatus.ACTIVO
        ? UserStatus.INACTIVO
        : UserStatus.ACTIVO;

    await this.usersRepository.update(id, { estado: newStatus });
    return await this.findOne(id);
  }

  // Obtener estadísticas de usuarios (para dashboard admin)
  async getStats() {
    const [total, activos, inactivos] = await Promise.all([
      this.usersRepository.count(),
      this.usersRepository.count({ where: { estado: UserStatus.ACTIVO } }),
      this.usersRepository.count({ where: { estado: UserStatus.INACTIVO } }),
    ]);

    const porRol = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.rol', 'rol')
      .addSelect('COUNT(*)', 'cantidad')
      .where('user.estado = :estado', { estado: UserStatus.ACTIVO })
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
      where: { rol: role, estado: UserStatus.ACTIVO },
      select: ['id', 'name', 'email', 'rol', 'telefono', 'fecha_creacion'],
    });
  }

  async findByEstablecimiento(establecimientoId: number): Promise<UserEntity[]> {
    return this.usersRepository.find({
      where: { id_establecimiento: establecimientoId },
      select: ['id', 'name', 'email', 'rol', 'estado'],
    });
  }

  // Buscar usuarios (para panel admin)
  async search(query: string): Promise<UserEntity[]> {
    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.name LIKE :query OR user.email LIKE :query', {
        query: `%${query}%`,
      })
      .select(['user.id', 'user.name', 'user.email', 'user.rol', 'user.estado'])
      .getMany();
  }

  // Obtener usuario con todos los campos incluyendo id_establecimiento
  async findOneRaw(id: number): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // ACTUALIZAR CONTEXTO (Guardar cuál es el campo activo del usuario)
  // ============================================================
  async assignEstablecimiento(
    userId: number,
    establecimientoId: number | null,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      id_establecimiento: establecimientoId,
    });
  }

  // Obtener establecimientos asignados a un usuario
  async getEstablecimientos(userId: number): Promise<number[]> {
    const asignaciones = await this.userEstRepo.find({ where: { userId } });
    return asignaciones.map((a) => a.establecimientoId);
  }

  async verificarPertenenciaAdmin(adminUser: any, targetUserId: number): Promise<void> {
    if (adminUser?.rol === UserRole.SUPER_ADMIN) return;
    const target = await this.usersRepository.findOne({
      where: { id: targetUserId },
      select: ['id', 'rol', 'id_establecimiento'],
    });
    if (!target) return; // findOne lanzará 404 más adelante
    if (target.rol === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('No tenés permisos para operar sobre este usuario');
    }

    // Sin establecimiento principal se mira su pertenencia a equipos; si no tiene
    // ninguno, no es de nadie y solo lo opera un super_admin.
    const targetEstIds = target.id_establecimiento
      ? [target.id_establecimiento]
      : await this.getEstablecimientos(targetUserId);

    // No alcanza con compartir un establecimiento: hay que administrarlo.
    for (const id of targetEstIds) {
      if ((await this.rolEstablecimiento.rolEn(adminUser, id)) === 'admin') return;
    }
    throw new ForbiddenException('No tenés permisos para operar sobre este usuario');
  }

  async generarTokenBot(userId: number): Promise<{ token: string; expires: Date }> {
    const token = Math.floor(10000000 + Math.random() * 90000000).toString(); // 8 dígitos
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    await this.usersRepository.update(userId, {
      bot_link_token: token,
      bot_link_token_expires: expires,
    });
    return { token, expires };
  }

  // Sincronizar establecimientos de un usuario (reemplaza todos)
  // ===== ALCANCE POR CAMPO =====
  // El rol global 'admin' lo tiene cualquiera que se registra: los permisos sobre
  // otros usuarios salen de los campos que el actor administra.

  // Campos donde el actor es miembro (cualquier rol).
  async camposDe(actor: any): Promise<number[]> {
    const ids = [
      actor?.id_establecimiento,
      ...(actor?.userEstablecimientos || []).map((ue: any) => ue.establecimientoId),
      ...(actor?.userId ? await this.getEstablecimientos(actor.userId) : []),
    ];
    return [...new Set(ids.filter((v) => v !== null && v !== undefined).map(Number))];
  }

  // Campos que el actor administra. null = todos (super_admin).
  async camposAdministrados(actor: any): Promise<number[] | null> {
    if (actor?.rol === UserRole.SUPER_ADMIN) return null;
    const propios: number[] = [];
    for (const id of await this.camposDe(actor)) {
      if ((await this.rolEstablecimiento.rolEn(actor, id)) === 'admin') propios.push(id);
    }
    return propios;
  }

  async exigirAdminDeCampo(actor: any, idEstablecimiento: number): Promise<void> {
    const campos = await this.camposAdministrados(actor);
    if (campos !== null && !campos.includes(Number(idEstablecimiento))) {
      throw new ForbiddenException('No administrás ese establecimiento');
    }
  }

  // Usuarios con campo principal o membresía en alguno de esos campos. null = todos.
  async findAllEn(campos: number[] | null): Promise<UserEntity[]> {
    if (campos === null) return this.findAll();
    if (campos.length === 0) return [];
    const miembros = await this.userEstRepo.find({ where: { establecimientoId: In(campos) } });
    const ids = [...new Set(miembros.map((m) => m.userId))];
    return this.usersRepository.find({
      where: [{ id_establecimiento: In(campos) }, ...(ids.length ? [{ id: In(ids) }] : [])],
      relations: ['establecimientosAsignados'],
      select: ['id', 'name', 'email', 'rol', 'estado', 'telefono', 'id_establecimiento', 'fecha_creacion', 'ultimo_acceso'],
      order: { fecha_creacion: 'DESC' },
    });
  }

  async getStatsEn(campos: number[] | null) {
    if (campos === null) return this.getStats();
    const lista = await this.findAllEn(campos);
    const activos = lista.filter((u) => u.estado === UserStatus.ACTIVO);
    const porRol: Record<string, number> = {};
    for (const u of activos) porRol[u.rol] = (porRol[u.rol] || 0) + 1;
    return {
      total: lista.length,
      activos: activos.length,
      inactivos: lista.length - activos.length,
      por_rol: Object.entries(porRol).map(([rol, cantidad]) => ({ rol, cantidad })),
    };
  }

  async findByRoleEn(role: UserRole, campos: number[] | null) {
    if (campos === null) return this.findByRole(role);
    return (await this.findAllEn(campos))
      .filter((u) => u.rol === role && u.estado === UserStatus.ACTIVO)
      .map(({ id, name, email, rol, telefono, fecha_creacion }) => ({ id, name, email, rol, telefono, fecha_creacion }));
  }

  // alcance: campos que se pueden tocar (los que administra el actor). Las membresías
  // del usuario en otros campos se conservan. null = reemplaza todas (super_admin).
  async syncEstablecimientos(userId: number, ids: number[], alcance: number[] | null = null): Promise<void> {
    if (alcance === null) {
      await this.userEstRepo.delete({ userId });
    } else if (alcance.length > 0) {
      await this.userEstRepo.delete({ userId, establecimientoId: In(alcance) });
    }
    if (ids.length > 0) {
      const nuevas = ids.map((establecimientoId) =>
        this.userEstRepo.create({ userId, establecimientoId, rol: 'admin' }),
      );
      await this.userEstRepo.save(nuevas);
    }
  }
}
