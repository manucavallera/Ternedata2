import {
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserEntity, UserRole } from './entity/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEstablecimientoEntity } from './entity/user-establecimiento.entity';
import { Establecimiento } from './entity/establecimiento.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
    @InjectRepository(Establecimiento)
    @Optional()
    private readonly establecimientoRepository: Repository<Establecimiento>,
  ) {}

  /** Global platform view. Never expose the password or reset-token columns. */
  async findAllGlobal() {
    const users = await this.usersRepository.find({
      relations: ['establecimiento', 'userEstablecimientos'],
      select: [
        'id', 'name', 'email', 'rol', 'estado', 'id_establecimiento',
        'ultimo_acceso',
      ],
      order: { fecha_creacion: 'DESC' },
    });

    const establishmentIds = [
      ...new Set(
        users.flatMap((user) => [
          user.id_establecimiento,
          ...(user.userEstablecimientos || []).map((assignment) => assignment.establecimientoId),
        ]).filter((id): id is number => Number.isInteger(id)),
      ),
    ];
    const establishments = establishmentIds.length && this.establecimientoRepository
      ? await this.establecimientoRepository.findBy({ id: In(establishmentIds) })
      : [];
    const names = new Map(establishments.map((establishment) => [establishment.id, establishment.nombre]));

    return users.map((user) => {
      const assignedIds = (user.userEstablecimientos || []).map(
        (assignment) => assignment.establecimientoId,
      );
      const ids = [...new Set([
        ...(Number.isInteger(user.id_establecimiento) ? [user.id_establecimiento] : []),
        ...assignedIds,
      ])];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        rol: user.rol,
        estado: user.estado,
        id_establecimiento: user.id_establecimiento,
        establecimiento: user.establecimiento?.nombre || names.get(user.id_establecimiento) || null,
        establecimientosAsignados: ids.map((id) => ({ id, nombre: names.get(id) || null })),
        ultimo_acceso: user.ultimo_acceso,
      };
    });
  }

  // ============================================================
  // 🔍 FIND ALL (Lógica de Dueño Multi-Campo)
  // ============================================================
  async findAll(currentUser: any): Promise<UserEntity[]> {
    const esSuperAdmin = currentUser.rol === UserRole.SUPER_ADMIN;

    // CASO 1: SUPER ADMIN
    if (esSuperAdmin) {
      return this.usersRepository.find({
        // 👇 MAGIA AQUÍ: Traemos la relación de roles por establecimiento
        relations: ['userEstablecimientos'],
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

    // CASO 2: ADMIN DE CAMPO (Ve todos SUS campos)
    if (currentUser.rol === 'admin') {
      const misPropiedades = await this.userEstablecimientoRepository.find({
        where: { userId: currentUser.userId },
        select: ['establecimientoId'],
      });

      const misIds = misPropiedades.map((r) => r.establecimientoId);

      // Si no tiene relaciones, fallback al id actual
      if (misIds.length === 0) {
        if (currentUser.id_establecimiento) {
          return this.usersRepository.find({
            where: { id_establecimiento: currentUser.id_establecimiento },
            // 👇 MAGIA AQUÍ TAMBIÉN
            relations: ['userEstablecimientos'],
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
        return [];
      }

      // Traemos usuarios de CUALQUIERA de sus campos
      return this.usersRepository.find({
        where: {
          id_establecimiento: In(misIds),
        },
        // 👇 MAGIA AQUÍ TAMBIÉN
        relations: ['userEstablecimientos'],
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

    // CASO 3: EMPLEADOS
    if (currentUser.rol === 'veterinario' || currentUser.rol === 'operario') {
      if (!currentUser.id_establecimiento) return [];

      return this.usersRepository.find({
        where: { id_establecimiento: currentUser.id_establecimiento },
        // 👇 MAGIA AQUÍ TAMBIÉN
        relations: ['userEstablecimientos'],
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

    return [];
  }

  // 👇 MODIFICADO: Estadísticas
  async getStats(currentUser: any) {
    let whereClause: any = {};
    let esSuperAdmin = currentUser.rol === UserRole.SUPER_ADMIN;

    if (!esSuperAdmin) {
      if (currentUser.rol === 'admin') {
        const misPropiedades = await this.userEstablecimientoRepository.find({
          where: { userId: currentUser.userId },
          select: ['establecimientoId'],
        });
        const misIds = misPropiedades.map((r) => r.establecimientoId);

        if (misIds.length > 0) {
          whereClause = { id_establecimiento: In(misIds) };
        } else if (currentUser.id_establecimiento) {
          whereClause = { id_establecimiento: currentUser.id_establecimiento };
        } else {
          return { total: 0, activos: 0, inactivos: 0, por_rol: [] };
        }
      } else {
        if (!currentUser.id_establecimiento) {
          return { total: 0, activos: 0, inactivos: 0, por_rol: [] };
        }
        whereClause = { id_establecimiento: currentUser.id_establecimiento };
      }
    }

    const [total, activos, inactivos] = await Promise.all([
      this.usersRepository.count({ where: whereClause }),
      this.usersRepository.count({
        where: { ...whereClause, estado: 'activo' },
      }),
      this.usersRepository.count({
        where: { ...whereClause, estado: 'inactivo' },
      }),
    ]);

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .select('user.rol', 'rol')
      .addSelect('COUNT(*)', 'cantidad')
      .where('user.estado = :estado', { estado: 'activo' });

    if (!esSuperAdmin) {
      if (
        whereClause.id_establecimiento &&
        typeof whereClause.id_establecimiento === 'object'
      ) {
        queryBuilder.andWhere('user.id_establecimiento IN (:...ids)', {
          ids: whereClause.id_establecimiento.value,
        });
      } else if (whereClause.id_establecimiento) {
        queryBuilder.andWhere('user.id_establecimiento = :idEst', {
          idEst: whereClause.id_establecimiento,
        });
      }
    }

    const porRol = await queryBuilder.groupBy('user.rol').getRawMany();

    return {
      total,
      activos,
      inactivos,
      por_rol: porRol,
    };
  }

  // ===== RESTO DE MÉTODOS =====

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
      // 👇 CAMBIO CLAVE: Agregamos 'userEstablecimientos' aquí
      relations: ['establecimiento', 'userEstablecimientos'],
      select: [
        'id',
        'name',
        'email',
        'rol', // Este es el rol global (operario)
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
    return await this.usersRepository.findOne({ where: { email } });
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

    if (updateUserDto.telefono && updateUserDto.telefono !== user.telefono) {
      const existingPhone = await this.usersRepository.findOne({
        where: { telefono: updateUserDto.telefono },
      });
      if (existingPhone) {
        throw new ConflictException('El teléfono ya está registrado por otro usuario');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    } else {
      delete updateUserDto.password;
    }

    await this.usersRepository.update(id, updateUserDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.usersRepository.update(id, { estado: 'inactivo' });
    return { message: 'Usuario desactivado correctamente' };
  }

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return await this.usersRepository.save(newUser);
  }

  async updateLastAccess(id: number): Promise<void> {
    await this.usersRepository.update(id, { ultimo_acceso: new Date() });
  }

  async changeRole(id: number, newRole: UserRole): Promise<UserEntity> {
    if (!Object.values(UserRole).includes(newRole)) {
      throw new HttpException('Rol inválido', HttpStatus.BAD_REQUEST);
    }
    const user = await this.findOne(id);
    if (user.rol === UserRole.SUPER_ADMIN && newRole !== UserRole.SUPER_ADMIN) {
      const activeSuperAdmins = await this.usersRepository.count({
        where: { rol: UserRole.SUPER_ADMIN, estado: 'activo' },
      });
      if (activeSuperAdmins <= 1) {
        throw new ConflictException('No se puede degradar al último super_admin activo');
      }
    }
    await this.usersRepository.update(id, { rol: newRole });
    return await this.findOne(id);
  }

  async toggleStatus(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';
    if (user.rol === UserRole.SUPER_ADMIN && newStatus === 'inactivo') {
      const activeSuperAdmins = await this.usersRepository.count({
        where: { rol: UserRole.SUPER_ADMIN, estado: 'activo' },
      });
      if (activeSuperAdmins <= 1) {
        throw new ConflictException('No se puede desactivar al último super_admin activo');
      }
    }
    await this.usersRepository.update(id, { estado: newStatus });
    return await this.findOne(id);
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

  async assignEstablecimiento(userId: number, establecimientoId: number) {
    const existing = await this.userEstablecimientoRepository.findOne({
      where: { userId, establecimientoId },
    });

    if (existing) return existing;

    const newRelation = this.userEstablecimientoRepository.create({
      userId,
      establecimientoId,
    });

    return await this.userEstablecimientoRepository.save(newRelation);
  }

  async getEstablecimientos(userId: number): Promise<number[]> {
    const asignaciones = await this.userEstablecimientoRepository.find({ where: { userId } });
    return asignaciones.map((a) => a.establecimientoId);
  }

  async syncEstablecimientos(userId: number, ids: number[]): Promise<void> {
    await this.userEstablecimientoRepository.delete({ userId });
    if (ids.length > 0) {
      const nuevas = ids.map((establecimientoId) =>
        this.userEstablecimientoRepository.create({ userId, establecimientoId }),
      );
      await this.userEstablecimientoRepository.save(nuevas);
    }
  }
}
