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
        `Error al crear: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 🚀 LÓGICA INFALIBLE: TOKEN + PROPIEDAD
  // ============================================================
  // Ahora recibe el ID asignado directamente, sin buscarlo en la BD
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

    // Lista base de mis propiedades
    const misEstablecimientos = relacionesDueño
      .filter((r) => r.establecimiento)
      .map((r) => ({
        ...r.establecimiento,
        mi_rol_en_campo: r.rol,
      }));

    // 2. Agregar donde soy EMPLEADO (si viene en el token y no está en la lista)
    if (establecimientoIdAsignado) {
      // Verificamos si ya lo tenemos (para no duplicar)
      const yaEsta = misEstablecimientos.some(
        (e) => e.id_establecimiento === establecimientoIdAsignado,
      );

      if (!yaEsta) {
        // Buscamos ese establecimiento específico
        const estAsignado = await this.establecimientoRepository.findOne({
          where: { id_establecimiento: establecimientoIdAsignado },
        });

        if (estAsignado) {
          misEstablecimientos.push({
            ...estAsignado,
            mi_rol_en_campo: 'colaborador_asignado',
          });
        }
      }
    }

    return misEstablecimientos;
  }

  // ============================================================
  // MÉTODOS ESTÁNDAR
  // ============================================================

  async findAll(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Establecimiento> {
    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id_establecimiento: id },
    });
    if (!establecimiento)
      throw new NotFoundException(`Establecimiento ${id} no encontrado`);
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

  async findAllIncludingInactive(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      order: { fecha_creacion: 'DESC' },
    });
  }
}
