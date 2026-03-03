import {
  Injectable,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm'; // 👈 Agregamos 'In'
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

        // Asignar contexto automáticamente
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
  // 🧠 LÓGICA ROBUSTA: DUEÑO + EMPLEADO
  // ============================================================
  async findAllMyEstablecimientos(userId: number): Promise<any[]> {
    // 1. Obtener establecimientos donde soy DUEÑO/SOCIO (Tabla intermedia)
    const relacionesDueño = await this.userEstablecimientoRepository.find({
      where: { userId: userId },
      relations: ['establecimiento'],
      order: { id: 'DESC' },
    });

    // Mapeamos a un array limpio
    const listaDueño = relacionesDueño
      .filter((r) => r.establecimiento) // Seguridad por si se borró el campo
      .map((r) => ({
        ...r.establecimiento,
        mi_rol_en_campo: r.rol, // 'dueno', 'veterinario', etc.
      }));

    // 2. Obtener establecimiento donde estoy ASIGNADO/EMPLEADO (Tabla Users)
    // Esto rescata a usuarios como 'manuel' (ID 1)
    let listaAsignado = [];
    try {
      const user = await this.usersService.findOne(userId);

      // Si tiene un establecimiento asignado y NO está ya en la lista de dueño...
      if (user.id_establecimiento) {
        const yaEstaEnLista = listaDueño.some(
          (e) => e.id_establecimiento === user.id_establecimiento,
        );

        if (!yaEstaEnLista) {
          const establecimientoAsignado =
            await this.establecimientoRepository.findOne({
              where: { id_establecimiento: user.id_establecimiento },
            });

          if (establecimientoAsignado) {
            listaAsignado.push({
              ...establecimientoAsignado,
              mi_rol_en_campo: 'colaborador_asignado', // Rol inferido
            });
          }
        }
      }
    } catch (error) {
      console.warn(`No se pudo obtener asignación de usuario ${userId}`, error);
    }

    // 3. UNIR AMBAS LISTAS 🤝
    return [...listaDueño, ...listaAsignado];
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
