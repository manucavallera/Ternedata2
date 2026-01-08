import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rodeos } from './entities/rodeos.entity';
import { CreateRodeoDto, UpdateRodeoDto } from './dto/rodeos.dto';

@Injectable()
export class RodeosService {
  constructor(
    @InjectRepository(Rodeos)
    private readonly rodeosRepository: Repository<Rodeos>,
  ) {}

  // ========== LISTAR RODEOS CON MULTI-TENANCY ==========

  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
    idEstablecimientoQuery?: number | null,
  ): Promise<any[]> {
    const query = this.rodeosRepository
      .createQueryBuilder('rodeo')
      .leftJoinAndSelect('rodeo.establecimiento', 'establecimiento');

    // Lógica multi-tenancy
    if (esAdmin) {
      if (idEstablecimientoQuery) {
        query.where('rodeo.id_establecimiento = :id', {
          id: idEstablecimientoQuery,
        });
      }
    } else {
      if (!idEstablecimiento) {
        throw new ForbiddenException(
          'Usuario no tiene establecimiento asignado',
        );
      }
      query.where('rodeo.id_establecimiento = :id', {
        id: idEstablecimiento,
      });
    }

    query.orderBy('rodeo.fecha_creacion', 'DESC');

    return await query.getMany();
  }
  // ========== OBTENER UN RODEO ==========
  // ========== OBTENER UN RODEO ==========
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<any> {
    // ⬅️ Cambiar a any
    const rodeo = await this.rodeosRepository
      .createQueryBuilder('rodeo')
      .leftJoinAndSelect('rodeo.establecimiento', 'establecimiento')
      .where('rodeo.id_rodeo = :id', { id })
      .getOne();

    if (!rodeo) {
      throw new NotFoundException(`Rodeo con ID ${id} no encontrado`);
    }

    // Verificar permisos multi-tenancy
    if (!esAdmin && rodeo.id_establecimiento !== idEstablecimiento) {
      throw new ForbiddenException('No tienes acceso a este rodeo');
    }

    // Contar terneros manualmente
    const count = await this.rodeosRepository
      .createQueryBuilder('r')
      .leftJoin('r.terneros', 'ternero')
      .where('r.id_rodeo = :id', { id: rodeo.id_rodeo })
      .getCount();

    return {
      ...rodeo,
      cantidad_terneros: count,
    };
  }

  // ========== CREAR RODEO ==========
  async create(
    createRodeoDto: CreateRodeoDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<Rodeos> {
    // Validar que el usuario puede crear en ese establecimiento
    if (!esAdmin) {
      if (!idEstablecimiento) {
        throw new ForbiddenException(
          'Usuario no tiene establecimiento asignado',
        );
      }
      if (createRodeoDto.id_establecimiento !== idEstablecimiento) {
        throw new ForbiddenException(
          'No puedes crear rodeos en otro establecimiento',
        );
      }
    }

    const nuevoRodeo = this.rodeosRepository.create(createRodeoDto);
    return await this.rodeosRepository.save(nuevoRodeo);
  }

  // ========== ACTUALIZAR RODEO ==========
  async update(
    id: number,
    updateRodeoDto: UpdateRodeoDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<Rodeos> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    // Verificar que no intente cambiar de establecimiento si no es admin
    if (
      !esAdmin &&
      updateRodeoDto.id_establecimiento &&
      updateRodeoDto.id_establecimiento !== idEstablecimiento
    ) {
      throw new ForbiddenException(
        'No puedes mover rodeos a otro establecimiento',
      );
    }

    Object.assign(rodeo, updateRodeoDto);
    return await this.rodeosRepository.save(rodeo);
  }

  // ========== TOGGLE ESTADO ==========
  async toggleEstado(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<Rodeos> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    rodeo.estado = rodeo.estado === 'activo' ? 'inactivo' : 'activo';

    return await this.rodeosRepository.save(rodeo);
  }

  // ========== ELIMINAR (SOFT DELETE) ==========
  async remove(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<void> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    // Verificar si tiene terneros asignados
    const cantidadTerneros = await this.rodeosRepository
      .createQueryBuilder('rodeo')
      .leftJoin('rodeo.terneros', 'ternero')
      .where('rodeo.id_rodeo = :id', { id })
      .getCount();

    if (cantidadTerneros > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rodeo porque tiene ${cantidadTerneros} ternero(s) asignado(s)`,
      );
    }

    await this.rodeosRepository.remove(rodeo);
  }

  // ========== OBTENER TERNEROS DE UN RODEO ==========
  async getTernerosDeRodeo(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<any> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    const terneros = await this.rodeosRepository
      .createQueryBuilder('rodeo')
      .leftJoinAndSelect('rodeo.terneros', 'ternero')
      .leftJoinAndSelect('ternero.madre', 'madre')
      .where('rodeo.id_rodeo = :id', { id })
      .getOne();

    return {
      rodeo: {
        id_rodeo: rodeo.id_rodeo,
        nombre: rodeo.nombre,
        tipo: rodeo.tipo,
      },
      terneros: terneros?.terneros || [],
    };
  }

  // ========== ESTADÍSTICAS DEL RODEO ==========
  async getEstadisticas(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<any> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    const stats = await this.rodeosRepository
      .createQueryBuilder('rodeo')
      .leftJoin('rodeo.terneros', 'ternero')
      .select('COUNT(ternero.id_ternero)', 'total')
      .addSelect("COUNT(CASE WHEN ternero.estado = 'vivo' THEN 1 END)", 'vivos')
      .addSelect(
        "COUNT(CASE WHEN ternero.estado = 'muerto' THEN 1 END)",
        'muertos',
      )
      .addSelect('AVG(ternero.peso)', 'peso_promedio')
      .where('rodeo.id_rodeo = :id', { id })
      .getRawOne();

    const total = parseInt(stats.total) || 0;
    const vivos = parseInt(stats.vivos) || 0;
    const muertos = parseInt(stats.muertos) || 0;
    const pesoPromedio = parseFloat(stats.peso_promedio) || 0;

    const porcentajeMortalidad =
      total > 0 ? ((muertos / total) * 100).toFixed(2) : 0;

    return {
      rodeo: {
        id_rodeo: rodeo.id_rodeo,
        nombre: rodeo.nombre,
        tipo: rodeo.tipo,
        estado: rodeo.estado,
      },
      estadisticas: {
        totalTerneros: total,
        ternerosVivos: vivos,
        ternerosMuertos: muertos,
        porcentajeMortalidad: parseFloat(porcentajeMortalidad),
        pesoPromedio: parseFloat(pesoPromedio.toFixed(2)),
      },
    };
  }
}
