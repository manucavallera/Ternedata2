// ms-nestjs-business/src/modules/madres/madres.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMadreDto } from './dto/create-madre.dto';
import { UpdateMadreDto } from './dto/update-madre.dto';
import { MadreEntity } from './entities/madre.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MadresService {
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

      const nuevaMadre = this.madreRepository.create(createMadreDto);
      const madreSave = await this.madreRepository.save(nuevaMadre);

      console.log('Madre creada:', {
        id: madreSave.id_madre,
        id_establecimiento: madreSave.id_establecimiento,
      });

      return madreSave;
    } catch (error) {
      console.error('❌ Error completo al crear madre:', error);

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
    idEstablecimientoQuery?: number | null, // ⬅️ NUEVO PARÁMETRO
  ): Promise<MadreEntity[]> {
    try {
      console.log(
        '🔍 Service Madres findAll - ID Usuario:',
        idEstablecimiento,
        'Es Admin:',
        esAdmin,
        'Query Param:',
        idEstablecimientoQuery,
      );

      const query = this.madreRepository
        .createQueryBuilder('madre')
        .leftJoinAndSelect('madre.terneros', 'terneros')
        .leftJoinAndSelect('madre.eventos', 'eventos');

      // Lógica de filtrado
      if (esAdmin) {
        // Si es admin Y tiene query param, filtrar por ese establecimiento
        if (idEstablecimientoQuery) {
          console.log(
            '✅ Admin filtrando madres por establecimiento:',
            idEstablecimientoQuery,
          );
          query.where('madre.id_establecimiento = :idEstablecimiento', {
            idEstablecimiento: idEstablecimientoQuery,
          });
        } else {
          console.log('✅ Admin viendo TODAS las madres (sin filtro)');
          // No agregar ningún where - devuelve todo
        }
      } else {
        // Si NO es admin, SIEMPRE filtrar por su establecimiento
        if (idEstablecimiento) {
          console.log(
            '✅ Usuario no-admin, filtrando madres por su establecimiento:',
            idEstablecimiento,
          );
          query.where('madre.id_establecimiento = :idEstablecimiento', {
            idEstablecimiento,
          });
        } else {
          console.warn('⚠️ Usuario no-admin sin establecimiento asignado');
        }
      }

      const madres = await query.getMany();
      console.log(`✅ Encontradas ${madres.length} madres`);

      return madres;
    } catch (error) {
      console.error('Error en findAll madres:', error);
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
