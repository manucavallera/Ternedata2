import {
  HttpException,
  HttpStatus,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UserEntity, UserRole } from './entity/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm'; // 👈 IMPORTANTE: Agregamos 'In'
import * as bcrypt from 'bcrypt';
// 👇 IMPORTAR LA NUEVA ENTIDAD
import { UserEstablecimientoEntity } from './entity/user-establecimiento.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    // 👇 INYECTAR EL REPOSITORIO DE RELACIONES
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
  ) {}

  // ============================================================
  // 🔍 FIND ALL (Lógica de Dueño Multi-Campo)
  // ============================================================
  async findAll(currentUser: any): Promise<UserEntity[]> {
    // CASO 1: SUPER ADMIN (Ve todo el sistema)
    // Agregamos también userId === 2 por si acaso es tu usuario maestro
    const esSuperAdmin =
      currentUser.rol === 'super_admin' || currentUser.userId === 2;

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

    // CASO 2: ADMIN DE CAMPO (Ve todos SUS campos)
    if (currentUser.rol === 'admin') {
      // A. Preguntamos: "¿De qué campos es dueño este señor?"
      const misPropiedades = await this.userEstablecimientoRepository.find({
        where: { userId: currentUser.userId },
        select: ['establecimientoId'],
      });

      // B. Sacamos los IDs limpios: [1, 5, 7...]
      const misIds = misPropiedades.map((r) => r.establecimientoId);

      // Si no tiene relaciones en la tabla intermedia, usamos fallback:
      // Muestra solo donde está parado actualmente (para que no vea vacío)
      if (misIds.length === 0) {
        if (currentUser.id_establecimiento) {
          return this.usersRepository.find({
            where: { id_establecimiento: currentUser.id_establecimiento },
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

      // C. Traemos usuarios que trabajen en CUALQUIERA de esos campos
      return this.usersRepository.find({
        where: {
          id_establecimiento: In(misIds), // 👈 LA CLAVE: Busca en toda la lista de propiedades
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

    // CASO 3: EMPLEADOS (Veterinario/Operario)
    // Solo ven a sus compañeros del campo actual
    if (currentUser.rol === 'veterinario' || currentUser.rol === 'operario') {
      if (!currentUser.id_establecimiento) return [];

      return this.usersRepository.find({
        where: { id_establecimiento: currentUser.id_establecimiento },
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

  // 👇 MODIFICADO: Estadísticas con filtro inteligente
  async getStats(currentUser: any) {
    // 1. Definimos el filtro base
    let whereClause: any = {};
    let esSuperAdmin =
      currentUser.rol === 'super_admin' || currentUser.userId === 2;

    // Si NO es Super Admin
    if (!esSuperAdmin) {
      if (currentUser.rol === 'admin') {
        // Si es Admin, intentamos buscar sus múltiples propiedades también para stats
        const misPropiedades = await this.userEstablecimientoRepository.find({
          where: { userId: currentUser.userId },
          select: ['establecimientoId'],
        });
        const misIds = misPropiedades.map((r) => r.establecimientoId);

        if (misIds.length > 0) {
          whereClause = { id_establecimiento: In(misIds) }; // Estadísticas de TODOS sus campos
        } else if (currentUser.id_establecimiento) {
          whereClause = { id_establecimiento: currentUser.id_establecimiento };
        } else {
          return { total: 0, activos: 0, inactivos: 0, por_rol: [] };
        }
      } else {
        // Empleados normales
        if (!currentUser.id_establecimiento) {
          return { total: 0, activos: 0, inactivos: 0, por_rol: [] };
        }
        whereClause = { id_establecimiento: currentUser.id_establecimiento };
      }
    }

    // 2. Ejecutamos las consultas con el filtro aplicado
    const [total, activos, inactivos] = await Promise.all([
      this.usersRepository.count({ where: whereClause }),
      this.usersRepository.count({
        where: { ...whereClause, estado: 'activo' },
      }),
      this.usersRepository.count({
        where: { ...whereClause, estado: 'inactivo' },
      }),
    ]);

    // 3. Consulta especial para agrupar por roles
    // Nota: QueryBuilder con "In" array puede ser complejo, simplificamos devolviendo raw data filtrada si es array
    // O usamos lógica estándar si es un solo ID.

    // Para simplificar y evitar errores con QueryBuilder + IN clause manual:
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
        // Es un IN(...)
        queryBuilder.andWhere('user.id_establecimiento IN (:...ids)', {
          ids: whereClause.id_establecimiento.value,
        });
      } else if (whereClause.id_establecimiento) {
        // Es un ID simple
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

  // ===== RESTO DE MÉTODOS (SIN CAMBIOS) =====

  async findOne(id: number): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({
      where: { id },
      // 👇 AGREGA ESTO: Para que el front reciba el objeto completo del establecimiento
      relations: ['establecimiento'],
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
        // Nota: Al usar 'select' y 'relations' juntos, TypeORM a veces requiere
        // que la entidad 'establecimiento' esté bien definida en el Entity.
        // Si sigue fallando, prueba comentar el array 'select' temporalmente para depurar.
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
    await this.usersRepository.update(id, { rol: newRole });
    return await this.findOne(id);
  }

  async toggleStatus(id: number): Promise<UserEntity> {
    const user = await this.findOne(id);
    const newStatus = user.estado === 'activo' ? 'inactivo' : 'activo';
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

  // 👇 AGREGAR ESTO EN users.service.ts (al final, antes de cerrar la clase)
  async assignEstablecimiento(userId: number, establecimientoId: number) {
    // 1. Verificar si ya existe la relación para no duplicar
    const existing = await this.userEstablecimientoRepository.findOne({
      where: { userId, establecimientoId },
    });

    if (existing) return existing;

    // 2. Crear la nueva relación
    const newRelation = this.userEstablecimientoRepository.create({
      userId,
      establecimientoId,
    });

    return await this.userEstablecimientoRepository.save(newRelation);
  }
}
