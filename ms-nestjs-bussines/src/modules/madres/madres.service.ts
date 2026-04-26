// ms-nestjs-business/src/modules/madres/madres.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateMadreDto } from './dto/create-madre.dto';
import { UpdateMadreDto } from './dto/update-madre.dto';
import { MadreEntity } from './entities/madre.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MadresService {
  private readonly logger = new Logger(MadresService.name);

  constructor(
    @InjectRepository(MadreEntity)
    private readonly madreRepository: Repository<MadreEntity>,
  ) {}

  // ============================================================
  // CREAR MADRE (con id_establecimiento)
  // ============================================================
  async create(
    createMadreDto: CreateMadreDto & { id_establecimiento: number },
  ): Promise<MadreEntity> {
    try {
      // Validar que tenga establecimiento asignado
      if (!createMadreDto.id_establecimiento) {
        throw new ForbiddenException(
          'No se puede crear una madre sin establecimiento asignado',
        );
      }

      if (createMadreDto.rp_madre) {
        const madreExistente = await this.madreRepository.findOne({
          where: {
            rp_madre: createMadreDto.rp_madre,
            id_establecimiento: createMadreDto.id_establecimiento,
          },
        });
        if (madreExistente) {
          throw new HttpException(
            `Ya existe una madre con RP ${createMadreDto.rp_madre} en este establecimiento`,
            HttpStatus.CONFLICT,
          );
        }
      }

      const nuevaMadre = this.madreRepository.create(createMadreDto);
      const madreSave = await this.madreRepository.save(nuevaMadre);
      return madreSave;
    } catch (error) {
      if (error instanceof HttpException || error instanceof ForbiddenException) throw error;
      this.logger.error('Error al crear madre', error);

      // Si es error de duplicado (violación de unique constraint)
      if (error.code === '23505') {
        throw new HttpException(
          'Ya existe una madre con ese RP',
          HttpStatus.CONFLICT,
        );
      }

      // Si es error de FK (establecimiento no existe)
      if (error.code === '23503') {
        throw new HttpException(
          'El establecimiento especificado no existe',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Cualquier otro error
      throw new HttpException(
        `Error al crear la madre: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // LISTAR MADRES (con filtro por establecimiento)
  // ============================================================
  // ============================================================
  // LISTAR MADRES (con filtro por establecimiento)
  // ============================================================
  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
    idEstablecimientoQuery?: number | null,
    sinRodeo?: boolean,
    idRodeo?: number | null,
    page: number = 1,
    limit: number = 20,
    search?: string | null,
  ): Promise<any> {
    try {
      const query = this.madreRepository
        .createQueryBuilder('madre')
        .leftJoinAndSelect('madre.terneros', 'terneros')
        .leftJoinAndSelect('madre.eventos', 'eventos');

      // Lógica de filtrado
      if (esAdmin) {
        const filterId = idEstablecimientoQuery || idEstablecimiento;
        if (filterId) {
          query.where('madre.id_establecimiento = :idEstablecimiento', {
            idEstablecimiento: filterId,
          });
        }
      } else {
        // Si NO es admin, SIEMPRE filtrar por su establecimiento
        if (idEstablecimiento) {
          query.where('madre.id_establecimiento = :idEstablecimiento', {
            idEstablecimiento,
          });
        } else {
          this.logger.warn('Usuario no-admin sin establecimiento asignado');
        }
      }

      // Filtro: madres sin rodeo asignado
      if (sinRodeo) {
        query.andWhere('madre.id_rodeo IS NULL');
      }

      // Filtro: madres de un rodeo específico
      if (idRodeo) {
        query.andWhere('madre.id_rodeo = :idRodeo', { idRodeo });
      }

      // Filtro: búsqueda por nombre o RP
      if (search) {
        query.andWhere(
          '(LOWER(madre.nombre) LIKE LOWER(:search) OR CAST(madre.rp_madre AS TEXT) LIKE :search)',
          { search: `%${search}%` },
        );
      }

      const [madres, total] = await query
        .orderBy('madre.id_madre', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();


      return {
        data: madres,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error en findAll madres', error);
      throw new HttpException(
        `Error al obtener las madres: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //
  // BUSCAR UNA MADRE (validar propiedad)

  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<MadreEntity> {
    try {
      const query = this.madreRepository
        .createQueryBuilder('madre')
        .leftJoinAndSelect('madre.terneros', 'terneros')
        .leftJoinAndSelect('madre.eventos', 'eventos')
        .where('madre.id_madre = :id', { id });

      // Si NO es admin, validar establecimiento
      if (!esAdmin && idEstablecimiento) {
        query.andWhere('madre.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      }

      const madre = await query.getOne();

      if (!madre) {
        throw new NotFoundException(
          'Madre no encontrada o no pertenece a su establecimiento',
        );
      }

      return madre;
    } catch (error) {
      throw new HttpException(
        `Error al obtener la madre con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ACTUALIZAR MADRE (validar propiedad)
  // ============================================================
  async update(
    id: number,
    updateMadreDto: UpdateMadreDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<MadreEntity> {
    try {
      // Validar que la madre existe y pertenece al establecimiento
      const madre = await this.findOne(id, idEstablecimiento, esAdmin);

      // No permitir cambiar el establecimiento
      if (updateMadreDto['id_establecimiento']) {
        delete updateMadreDto['id_establecimiento'];
      }

      // Actualizar
      const updatedMadre = Object.assign(madre, updateMadreDto);
      const savedMadre = await this.madreRepository.save(updatedMadre);

      return savedMadre;
    } catch (error) {
      throw new HttpException(
        `Error al actualizar la madre con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ELIMINAR MADRE (validar propiedad)
  // ============================================================
  async remove(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<{ message: string }> {
    try {
      const madre = await this.findOne(id, idEstablecimiento, esAdmin);
      await this.madreRepository.remove(madre);

      return {
        message: 'Madre eliminada con éxito',
      };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar la madre con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ESTADÍSTICAS POR ESTABLECIMIENTO
  // ============================================================
  async getEstadisticas(idEstablecimiento: number | null, esAdmin: boolean) {
    try {
      const query = this.madreRepository.createQueryBuilder('madre');

      if (!esAdmin && idEstablecimiento) {
        query.where('madre.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      }

      const [total, secas, enTambo] = await Promise.all([
        query.getCount(),
        query
          .clone()
          .andWhere('madre.estado = :estado', { estado: 'Seca' })
          .getCount(),
        query
          .clone()
          .andWhere('madre.estado = :estado', { estado: 'En Tambo' })
          .getCount(),
      ]);

      return {
        total,
        secas,
        en_tambo: enTambo,
        establecimiento_id: idEstablecimiento,
      };
    } catch (error) {
      throw new HttpException(
        `Error al obtener estadísticas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
