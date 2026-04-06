import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateDiarreaTerneroDto } from './dto/create-diarrea-ternero.dto';
import { UpdateDiarreaTerneroDto } from './dto/update-diarrea-ternero.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DiarreaTerneroEntity } from './entities/diarrea-ternero.entity';
import { Repository } from 'typeorm';
import { TerneroEntity } from '../terneros/entities/ternero.entity';

@Injectable()
export class DiarreaTernerosService {
  constructor(
    @InjectRepository(DiarreaTerneroEntity)
    private readonly diarreaRepository: Repository<DiarreaTerneroEntity>,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
  ) {}

  // ✅ CREATE con multi-tenancy
  async create(
    createDiarreaTerneroDto: CreateDiarreaTerneroDto & {
      id_establecimiento: number;
    },
  ): Promise<DiarreaTerneroEntity> {
    try {
      // ✅ AGREGAR ESTOS LOGS AL INICIO:
      console.log('📦 Service CREATE - DTO completo:', createDiarreaTerneroDto);
      console.log(
        '🏢 ID Establecimiento recibido:',
        createDiarreaTerneroDto.id_establecimiento,
      );
      console.log(
        '🏢 Tipo:',
        typeof createDiarreaTerneroDto.id_establecimiento,
      );
      console.log('🏢 Es falsy?:', !createDiarreaTerneroDto.id_establecimiento);
      // Validar que venga el establecimiento
      if (!createDiarreaTerneroDto.id_establecimiento) {
        throw new ForbiddenException(
          'Usuario sin establecimiento asignado. No puede registrar episodios de diarrea.',
        );
      }

      // Buscar el ternero por ID
      const ternero = await this.terneroRepository.findOne({
        where: { id_ternero: createDiarreaTerneroDto.id_ternero },
      });

      if (!ternero) {
        throw new HttpException(
          `No se encontró el ternero con ID: ${createDiarreaTerneroDto.id_ternero}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Validar que el ternero pertenezca al mismo establecimiento
      if (
        ternero.id_establecimiento !==
        createDiarreaTerneroDto.id_establecimiento
      ) {
        throw new ForbiddenException(
          'El ternero no pertenece a su establecimiento',
        );
      }

      // Auto-calcular número de episodio para este ternero específico
      const episodiosAnteriores = await this.diarreaRepository.count({
        where: {
          ternero: { id_ternero: createDiarreaTerneroDto.id_ternero },
        },
      });

      const numeroEpisodio = episodiosAnteriores + 1;

      // Generar alertas médicas para casos recurrentes
      if (numeroEpisodio > 3) {
        console.warn(
          `🚨 ALERTA MÉDICA: Ternero ID ${createDiarreaTerneroDto.id_ternero} tiene ${numeroEpisodio} episodios de diarrea. Requiere evaluación veterinaria especializada.`,
        );
      }

      if (
        createDiarreaTerneroDto.severidad === 'Severa' ||
        createDiarreaTerneroDto.severidad === 'Crítica'
      ) {
        console.warn(
          `⚠️ ATENCIÓN: Episodio de severidad ${createDiarreaTerneroDto.severidad} registrado para ternero ID ${createDiarreaTerneroDto.id_ternero}.`,
        );
      }

      // Crear el registro con auto-cálculo del episodio
      const nuevaDiarreaTernero = this.diarreaRepository.create({
        fecha_diarrea_ternero: `${createDiarreaTerneroDto.fecha_diarrea_ternero}T12:00:00`,
        severidad: createDiarreaTerneroDto.severidad,
        numero_episodio: numeroEpisodio,
        observaciones: createDiarreaTerneroDto.observaciones || '',
        id_establecimiento: createDiarreaTerneroDto.id_establecimiento,
        ternero,
      });

      const diarreaGuardada =
        await this.diarreaRepository.save(nuevaDiarreaTernero);

      console.log(
        `✅ Episodio #${numeroEpisodio} de diarrea registrado para ternero ID ${createDiarreaTerneroDto.id_ternero} - Severidad: ${createDiarreaTerneroDto.severidad}`,
      );

      return diarreaGuardada;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al registrar episodio de diarrea: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND ALL con multi-tenancy
  // ✅ FIND ALL con multi-tenancy
  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
    idEstablecimientoQuery?: number | null, // ⬅️ NUEVO PARÁMETRO
  ): Promise<DiarreaTerneroEntity[]> {
    try {
      console.log(
        '🔍 Service Diarrea findAll - ID Usuario:',
        idEstablecimiento,
        'Es Admin:',
        esAdmin,
        'Query Param:',
        idEstablecimientoQuery,
      );

      const queryBuilder = this.diarreaRepository
        .createQueryBuilder('diarrea')
        .leftJoinAndSelect('diarrea.ternero', 'ternero')
        .orderBy('diarrea.fecha_diarrea_ternero', 'DESC')
        .addOrderBy('diarrea.numero_episodio', 'ASC');

      // Lógica de filtrado
      if (esAdmin) {
        const filterId = idEstablecimientoQuery || idEstablecimiento;
        if (filterId) {
          queryBuilder.where(
            'diarrea.id_establecimiento = :idEstablecimiento',
            { idEstablecimiento: filterId },
          );
        }
      } else {
        // Si NO es admin, SIEMPRE filtrar por su establecimiento
        if (idEstablecimiento) {
          console.log(
            '✅ Usuario no-admin, filtrando diarreas por su establecimiento:',
            idEstablecimiento,
          );
          queryBuilder.where(
            'diarrea.id_establecimiento = :idEstablecimiento',
            {
              idEstablecimiento,
            },
          );
        } else {
          console.warn('⚠️ Usuario no-admin sin establecimiento asignado');
        }
      }

      const diarreas = await queryBuilder.getMany();
      console.log(`✅ Encontrados ${diarreas.length} registros de diarrea`);

      return diarreas;
    } catch (error) {
      console.error('Error en findAll diarreas:', error);
      throw new HttpException(
        `Error al obtener todas las diarreas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND BY TERNERO con multi-tenancy
  async findByTerneroId(
    id_ternero: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<DiarreaTerneroEntity[]> {
    try {
      const queryBuilder = this.diarreaRepository
        .createQueryBuilder('diarrea')
        .leftJoinAndSelect('diarrea.ternero', 'ternero')
        .where('ternero.id_ternero = :id_ternero', { id_ternero })
        .orderBy('diarrea.numero_episodio', 'ASC');

      // Filtrar por establecimiento (solo si NO es admin)
      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'diarrea.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const historialDiarreas = await queryBuilder.getMany();

      if (historialDiarreas.length === 0) {
        throw new HttpException(
          `No se encontraron registros de diarrea para el ternero ID: ${id_ternero}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return historialDiarreas;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al buscar historial del ternero ID ${id_ternero}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ ESTADÍSTICAS con multi-tenancy
  async getEstadisticasTernero(
    id_ternero: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<{
    total_episodios: number;
    ultimo_episodio: Date;
    severidad_predominante: string;
    necesita_atencion_especial: boolean;
    dias_desde_ultimo_episodio: number;
  }> {
    try {
      const queryBuilder = this.diarreaRepository
        .createQueryBuilder('diarrea')
        .leftJoinAndSelect('diarrea.ternero', 'ternero')
        .where('ternero.id_ternero = :id_ternero', { id_ternero })
        .orderBy('diarrea.fecha_diarrea_ternero', 'DESC');

      // Filtrar por establecimiento (solo si NO es admin)
      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'diarrea.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const historial = await queryBuilder.getMany();

      if (historial.length === 0) {
        throw new HttpException(
          `No hay registros de diarrea para el ternero ID: ${id_ternero}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Calcular severidad más frecuente
      const severidades = historial.map((d) => d.severidad);
      const severidadMasFrecuente = severidades
        .sort(
          (a, b) =>
            severidades.filter((v) => v === a).length -
            severidades.filter((v) => v === b).length,
        )
        .pop();

      // Días desde último episodio
      const ultimaFecha = historial[0].fecha_diarrea_ternero;
      const hoy = new Date();
      const diasDesdeUltimo = Math.floor(
        (hoy.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        total_episodios: historial.length,
        ultimo_episodio: ultimaFecha,
        severidad_predominante: severidadMasFrecuente,
        necesita_atencion_especial:
          historial.length >= 3 ||
          historial.some((d) => d.requiereAtencionUrgente()),
        dias_desde_ultimo_episodio: diasDesdeUltimo,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al calcular estadísticas del ternero ID ${id_ternero}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND ONE con multi-tenancy
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<DiarreaTerneroEntity> {
    try {
      const queryBuilder = this.diarreaRepository
        .createQueryBuilder('diarrea')
        .leftJoinAndSelect('diarrea.ternero', 'ternero')
        .where('diarrea.id_diarrea_ternero = :id', { id });

      // Filtrar por establecimiento (solo si NO es admin)
      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'diarrea.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const diarreaTernero = await queryBuilder.getOne();

      if (!diarreaTernero) {
        throw new NotFoundException(
          'Registro de diarrea no encontrado o no pertenece a su establecimiento',
        );
      }

      return diarreaTernero;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al obtener la diarrea con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ UPDATE con multi-tenancy
  async update(
    id: number,
    updateDiarreaTerneroDto: UpdateDiarreaTerneroDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<DiarreaTerneroEntity> {
    try {
      // Verificar que el registro existe y pertenece al establecimiento
      const diarreaTernero = await this.findOne(id, idEstablecimiento, esAdmin);

      // No permitir cambiar el establecimiento
      if (updateDiarreaTerneroDto['id_establecimiento']) {
        delete updateDiarreaTerneroDto['id_establecimiento'];
      }

      // Si se cambia el ternero, validar
      if (
        updateDiarreaTerneroDto.id_ternero &&
        updateDiarreaTerneroDto.id_ternero !==
          diarreaTernero.ternero?.id_ternero
      ) {
        const nuevoTernero = await this.terneroRepository.findOne({
          where: { id_ternero: updateDiarreaTerneroDto.id_ternero },
        });

        if (!nuevoTernero) {
          throw new HttpException(
            `No se encontró ternero con ID: ${updateDiarreaTerneroDto.id_ternero}`,
            HttpStatus.NOT_FOUND,
          );
        }

        // Validar que el ternero pertenezca al mismo establecimiento
        if (
          !esAdmin &&
          nuevoTernero.id_establecimiento !== diarreaTernero.id_establecimiento
        ) {
          throw new ForbiddenException(
            'El ternero no pertenece a su establecimiento',
          );
        }

        diarreaTernero.ternero = nuevoTernero;
      }

      // Actualizar otros campos (numero_episodio NO se actualiza)
      if (updateDiarreaTerneroDto.fecha_diarrea_ternero) {
        diarreaTernero.fecha_diarrea_ternero = new Date(
          `${updateDiarreaTerneroDto.fecha_diarrea_ternero}T12:00:00`,
        );
      }
      if (updateDiarreaTerneroDto.severidad) {
        diarreaTernero.severidad = updateDiarreaTerneroDto.severidad;
      }
      if (updateDiarreaTerneroDto.observaciones !== undefined) {
        diarreaTernero.observaciones = updateDiarreaTerneroDto.observaciones;
      }

      return await this.diarreaRepository.save(diarreaTernero);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al actualizar la diarrea con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ REMOVE con multi-tenancy
  async remove(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<{ message: string }> {
    try {
      // Verificar que el registro existe y pertenece al establecimiento
      const diarrea = await this.findOne(id, idEstablecimiento, esAdmin);

      await this.diarreaRepository.remove(diarrea);

      return { message: 'Registro de diarrea eliminado con éxito' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error al eliminar la diarrea con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
