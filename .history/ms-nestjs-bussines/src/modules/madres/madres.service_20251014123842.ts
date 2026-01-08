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
      throw new HttpException(
        `Error al crear la madre: ${error.message}`,
        HttpStatus.CONFLICT,
      );
    }
  }

  // ============================================================
  // LISTAR MADRES (con filtro por establecimiento)
  // ============================================================
  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<MadreEntity[]> {
    try {
      console.log(
        '🔍 findAll Madres - ID Establecimiento:',
        idEstablecimiento,
        'Es Admin:',
        esAdmin,
      );

      const query = this.madreRepository
        .createQueryBuilder('madre')
        .leftJoinAndSelect('madre.terneros', 'terneros')
        .leftJoinAndSelect('madre.eventos', 'eventos');

      // Si NO es admin, filtrar por establecimiento
      if (!esAdmin && idEstablecimiento) {
        query.where('madre.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      }

      const madres = await query.getMany();
      console.log(`✅ Encontradas ${madres.length} madres`);

      return madres;
    } catch (error) {
      throw new HttpException(
        `Error al obtener las madres: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // BUSCAR UNA MADRE (validar propiedad)
  // ============================================================
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
