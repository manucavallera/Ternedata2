import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rodeos } from './entity/rodeos.entity';
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

    const rodeos = await query.getMany();

    // Agregar contador de terneros manualmente
    const rodeosConConteo = [];

    for (const rodeo of rodeos) {
      const countQuery = await this.rodeosRepository.query(
        `SELECT COUNT(*) as count FROM terneros WHERE id_rodeo = $1`,
        [rodeo.id_rodeo],
      );

      const cantidad = parseInt(countQuery[0]?.count || '0', 10);

      rodeosConConteo.push({
        ...rodeo,
        cantidad_terneros: cantidad,
      });
    }

    return rodeosConConteo;
  }

  // ========== OBTENER UN RODEO ==========
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<any> {
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

    // Contar terneros con query raw
    const countQuery = await this.rodeosRepository.query(
      `SELECT COUNT(*) as count FROM terneros WHERE id_rodeo = $1`,
      [rodeo.id_rodeo],
    );

    const cantidad = parseInt(countQuery[0]?.count || '0', 10);

    return {
      ...rodeo,
      cantidad_terneros: cantidad,
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
  ): Promise<any> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    const nuevoEstado = rodeo.estado === 'activo' ? 'inactivo' : 'activo';

    await this.rodeosRepository.update(
      { id_rodeo: id },
      { estado: nuevoEstado },
    );

    return await this.findOne(id, idEstablecimiento, esAdmin);
  }

  // ========== ELIMINAR (SOFT DELETE) ==========
  async remove(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<void> {
    const rodeo = await this.findOne(id, idEstablecimiento, esAdmin);

    // Verificar si tiene terneros asignados
    const countQuery = await this.rodeosRepository.query(
      `SELECT COUNT(*) as count FROM terneros WHERE id_rodeo = $1`,
      [id],
    );

    const cantidadTerneros = parseInt(countQuery[0]?.count || '0', 10);

    if (cantidadTerneros > 0) {
      throw new BadRequestException(
        `No se puede eliminar el rodeo porque tiene ${cantidadTerneros} ternero(s) asignado(s)`,
      );
    }

    await this.rodeosRepository.delete({ id_rodeo: id });
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

    const stats = await this.rodeosRepository.query(
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'vivo' THEN 1 END) as vivos,
        COUNT(CASE WHEN estado = 'muerto' THEN 1 END) as muertos,
        AVG(peso) as peso_promedio
      FROM terneros 
      WHERE id_rodeo = $1
      `,
      [id],
    );

    const total = parseInt(stats[0]?.total || '0', 10);
    const vivos = parseInt(stats[0]?.vivos || '0', 10);
    const muertos = parseInt(stats[0]?.muertos || '0', 10);
    const pesoPromedio = parseFloat(stats[0]?.peso_promedio || '0');

    const porcentajeMortalidad =
      total > 0 ? ((muertos / total) * 100).toFixed(2) : '0';

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
