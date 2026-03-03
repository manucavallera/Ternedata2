import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import {
  CreateEstablecimientoDto,
  UpdateEstablecimientoDto,
} from './dto/establecimiento.dto';
// 👇 1. Importamos Servicios y Entidades necesarias
import { UsersService } from '../users/users.service';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { RolEstablecimiento } from '../invitaciones/roles.enum';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepository: Repository<Establecimiento>,
    // 👇 2. Inyectamos el repo de la tabla intermedia
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
    // 👇 3. Inyectamos UsersService para actualizar el contexto del usuario
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // CREAR (Lógica PRO: Crea el campo y te asigna como Dueño)
  // ============================================================
  async create(
    createDto: CreateEstablecimientoDto,
    userId: number,
  ): Promise<Establecimiento> {
    try {
      // A. Crear y guardar el establecimiento físico
      const nuevoEstablecimiento =
        this.establecimientoRepository.create(createDto);
      const guardado =
        await this.establecimientoRepository.save(nuevoEstablecimiento);

      // B. ✨ Crear la relación en la tabla intermedia
      // Esto dice: "El usuario X es DUEÑO del establecimiento Y"
      if (userId) {
        const relacion = this.userEstablecimientoRepository.create({
          userId: userId,
          establecimientoId: guardado.id_establecimiento,
          rol: RolEstablecimiento.DUENO, // Le damos permisos totales
        });

        await this.userEstablecimientoRepository.save(relacion);
        console.log(
          `✅ Usuario ${userId} vinculado como DUEÑO de ${guardado.nombre}`,
        );

        // C. (UX) Actualizar al usuario para que "entre" a este campo automáticamente
        await this.usersService.assignEstablecimiento(
          userId,
          guardado.id_establecimiento,
        );
      }

      return guardado;
    } catch (error) {
      console.error(error);
      throw new HttpException(
        `Error al crear establecimiento: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // LISTAR MIS ESTABLECIMIENTOS (Donde tengo permiso)
  // ============================================================
  async findAllMyEstablecimientos(userId: number): Promise<any[]> {
    // 1. Buscamos en la tabla intermedia
    const relaciones = await this.userEstablecimientoRepository.find({
      where: { userId: userId },
      relations: ['establecimiento'], // Traemos los datos del campo
      order: { id: 'DESC' },
    });

    // 2. Extraemos los establecimientos y agregamos el rol con el que participo
    // Retornamos un array limpio para el frontend
    return relaciones
      .map((relacion) => {
        // Si el establecimiento existe (por seguridad)
        if (relacion.establecimiento) {
          return {
            ...relacion.establecimiento,
            mi_rol_en_campo: relacion.rol, // 👈 Dato útil: ¿Soy Dueño o Veterinario aquí?
          };
        }
      })
      .filter((e) => e !== undefined); // Filtramos nulos por si acaso
  }

  // ============================================================
  // MÉTODOS ESTÁNDAR (Admin Global o uso interno)
  // ============================================================

  // Obtener TODOS (Cuidado: Esto es para SuperAdmin de la plataforma)
  async findAll(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      where: { estado: 'activo' },
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findAllIncludingInactive(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Establecimiento> {
    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id_establecimiento: id },
    });

    if (!establecimiento) {
      throw new NotFoundException(`Establecimiento con ID ${id} no encontrado`);
    }

    return establecimiento;
  }

  async update(
    id: number,
    updateDto: UpdateEstablecimientoDto,
  ): Promise<Establecimiento> {
    await this.findOne(id);
    await this.establecimientoRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const establecimiento = await this.findOne(id);
    // Nota: En un sistema real, aquí deberíamos borrar también las relaciones en userEstablecimientoRepository
    // o usar "Cascada" en la entidad. Por ahora lo dejamos simple.
    await this.establecimientoRepository.remove(establecimiento);
  }

  async getEstadisticas() {
    const [total, activos, inactivos] = await Promise.all([
      this.establecimientoRepository.count(),
      this.establecimientoRepository.count({ where: { estado: 'activo' } }),
      this.establecimientoRepository.count({ where: { estado: 'inactivo' } }),
    ]);

    return { total, activos, inactivos };
  }
}
