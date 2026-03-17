// ms-nestjs-business/src/modules/establecimientos/establecimientos.service.ts
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
import { UsersService } from '../users/users.service';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { RolEstablecimiento } from '../invitaciones/roles.enum';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepository: Repository<Establecimiento>,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
    private readonly usersService: UsersService,
  ) {}

  // ============================================================
  // CREAR
  // ============================================================
  async create(
    createDto: CreateEstablecimientoDto,
    userId: number,
  ): Promise<Establecimiento> {
    try {
      const nuevoEstablecimiento =
        this.establecimientoRepository.create(createDto);
      const guardado =
        await this.establecimientoRepository.save(nuevoEstablecimiento);

      if (userId) {
        const relacion = this.userEstablecimientoRepository.create({
          userId: userId,
          establecimientoId: guardado.id_establecimiento,
          rol: RolEstablecimiento.DUENO,
        });

        await this.userEstablecimientoRepository.save(relacion);
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
  // 🚀 LISTAR (CORREGIDO: Tipos compatibles)
  // ============================================================
  async findAllMyEstablecimientos(
    userId: number,
    establecimientoIdAsignado?: number,
  ): Promise<any[]> {
    // 1. Obtener establecimientos donde soy DUEÑO (Tabla intermedia)
    const relacionesDueño = await this.userEstablecimientoRepository.find({
      where: { userId: userId },
      relations: ['establecimiento'],
      order: { id: 'DESC' },
    });

    // Mapeamos a un array limpio
    const listaDueño = relacionesDueño
      .filter((r) => r.establecimiento)
      .map((r) => ({
        ...r.establecimiento,
        mi_rol_en_campo: r.rol, // Aquí sí es un RolEstablecimiento oficial
      }));

    // 2. Obtener establecimiento donde estoy ASIGNADO (Token)
    // Definimos el array como 'any[]' para permitir flexibilidad de tipos
    const listaAsignado: any[] = [];

    if (establecimientoIdAsignado) {
      // Verificamos si ya está en la lista de dueño para no duplicar
      const yaEsta = listaDueño.some(
        (e) => e.id_establecimiento === establecimientoIdAsignado,
      );

      if (!yaEsta) {
        const estAsignado = await this.establecimientoRepository.findOne({
          where: { id_establecimiento: establecimientoIdAsignado },
        });

        if (estAsignado) {
          listaAsignado.push({
            ...estAsignado,
            // 👇 AQUÍ ESTÁ LA CORRECCIÓN CLAVE: 'as any'
            // Engañamos a TS para que acepte este string personalizado
            mi_rol_en_campo: 'colaborador_asignado' as any,
          });
        }
      }
    }

    // 3. UNIR AMBAS LISTAS
    return [...listaDueño, ...listaAsignado];
  }

  // ============================================================
  // MÉTODOS ESTÁNDAR
  // ============================================================

  async findAll(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      where: { estado: 'activo' }, // Solo activos para el SuperAdmin por defecto
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

  // ============================================================
  // EQUIPO
  // ============================================================
  async getEquipo(establecimientoId: number): Promise<any[]> {
    const miembros = await this.userEstablecimientoRepository.find({
      where: { establecimientoId },
      relations: ['user'],
    });

    return miembros.map((m) => ({
      userId: m.userId,
      nombre: m.user?.name || 'Sin nombre',
      email: m.user?.email || '',
      rol: m.rol,
    }));
  }

  async eliminarMiembro(
    establecimientoId: number,
    userId: number,
  ): Promise<void> {
    const relacion = await this.userEstablecimientoRepository.findOne({
      where: { establecimientoId, userId },
    });

    if (!relacion) {
      throw new NotFoundException(
        'El usuario no es miembro de este establecimiento',
      );
    }

    await this.userEstablecimientoRepository.remove(relacion);
  }
}
