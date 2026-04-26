// ms-nestjs-business/src/modules/terneros/terneros.service.ts
import {
  HttpException,
  HttpStatus,
  Injectable,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateTerneroDto,
  AddPesoDiarioDto,
  HistorialPesosResponseDto,
} from './dto/create-ternero.dto';
import { UpdateTerneroDto } from './dto/update-ternero.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TerneroEntity } from './entities/ternero.entity';
import { Repository } from 'typeorm';
import { MadreEntity } from '../madres/entities/madre.entity';

interface UpdateCalostradoDto {
  metodo_calostrado?: string;
  litros_calostrado?: number;
  fecha_hora_calostrado?: string;
  observaciones_calostrado?: string;
  grado_brix?: number;
}

@Injectable()
export class TernerosService {
  private readonly logger = new Logger(TernerosService.name);

  constructor(
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepository: Repository<MadreEntity>,
  ) {}

  // ============================================================
  // CREAR TERNERO (con id_establecimiento)
  // ============================================================
  async create(
    createTerneroDto: CreateTerneroDto & { id_establecimiento: number },
  ): Promise<TerneroEntity> {
    try {
      // Validar que tenga establecimiento asignado
      // Validar establecimiento
      if (!createTerneroDto.id_establecimiento) {
        throw new ForbiddenException(
          'Debe especificar un establecimiento para el ternero',
        );
      }

      const fechaNacimiento = new Date(createTerneroDto.fecha_nacimiento);
      if (fechaNacimiento > new Date()) {
        throw new HttpException(
          'La fecha de nacimiento no puede ser futura',
          HttpStatus.BAD_REQUEST,
        );
      }

      const terneroExistente = await this.terneroRepository.findOne({
        where: {
          rp_ternero: createTerneroDto.rp_ternero,
          id_establecimiento: createTerneroDto.id_establecimiento,
        },
      });
      if (terneroExistente) {
        throw new HttpException(
          `Ya existe un ternero con RP ${createTerneroDto.rp_ternero} en este establecimiento`,
          HttpStatus.CONFLICT,
        );
      }

      // Buscar la madre (solo si se proporcionó id_madre)
      let madre: MadreEntity | null = null;
      if (createTerneroDto.id_madre) {
        madre = await this.madreRepository.findOne({
          where: {
            id_madre: createTerneroDto.id_madre,
            id_establecimiento: createTerneroDto.id_establecimiento,
          },
        });

        if (!madre) {
          throw new HttpException(
            `No se encontró la madre con ID ${createTerneroDto.id_madre} en este establecimiento`,
            HttpStatus.NOT_FOUND,
          );
        }

        if (madre.fecha_nacimiento && fechaNacimiento < new Date(madre.fecha_nacimiento)) {
          throw new HttpException(
            'La fecha de nacimiento del ternero no puede ser anterior a la de su madre',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const nuevoTernero = this.terneroRepository.create();

      // Asignar propiedades básicas
      nuevoTernero.rp_ternero = createTerneroDto.rp_ternero;
      nuevoTernero.sexo = createTerneroDto.sexo;
      nuevoTernero.estado = createTerneroDto.estado;
      nuevoTernero.peso_nacer = createTerneroDto.peso_nacer;
      nuevoTernero.peso_15d = createTerneroDto.peso_15d;
      nuevoTernero.peso_30d = createTerneroDto.peso_30d;
      nuevoTernero.peso_45d = createTerneroDto.peso_45d;
      nuevoTernero.peso_largado = createTerneroDto.peso_largado;
      nuevoTernero.peso_ideal = createTerneroDto.peso_ideal;
      nuevoTernero.estimativo = createTerneroDto.estimativo;
      nuevoTernero.observaciones = createTerneroDto.observaciones;
      nuevoTernero.semen = createTerneroDto.semen;
      nuevoTernero.fecha_nacimiento = new Date(
        createTerneroDto.fecha_nacimiento,
      );
      nuevoTernero.madre = madre;
      nuevoTernero.id_establecimiento = createTerneroDto.id_establecimiento; // 🆕

      // Campos de calostrado opcionales
      if (createTerneroDto.metodo_calostrado) {
        nuevoTernero.metodo_calostrado = createTerneroDto.metodo_calostrado;
      }
      if (createTerneroDto.litros_calostrado) {
        nuevoTernero.litros_calostrado = createTerneroDto.litros_calostrado;
      }
      if (createTerneroDto.fecha_hora_calostrado) {
        nuevoTernero.fecha_hora_calostrado = new Date(
          createTerneroDto.fecha_hora_calostrado,
        );
      }
      if (createTerneroDto.observaciones_calostrado) {
        nuevoTernero.observaciones_calostrado =
          createTerneroDto.observaciones_calostrado;
      }

      const terneroGuardado = await this.terneroRepository.save(nuevoTernero);

      try {
        terneroGuardado.calcularIndicadoresCrecimiento();
      } catch (error) {
        this.logger.error('Error calculando indicadores en create', error);
        terneroGuardado.dias_desde_nacimiento = 0;
      }

      return terneroGuardado;
    } catch (error) {
      this.logger.error('Error al crear ternero', error);

      // Si es un error que ya lanzamos nosotros, re-lanzarlo
      if (
        error instanceof HttpException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Si es un error de base de datos por duplicado
      if (error.code === '23505') {
        // Código PostgreSQL para unique violation
        throw new HttpException(
          `Ya existe un ternero con esos datos`,
          HttpStatus.CONFLICT,
        );
      }

      // Para cualquier otro error, usar 500
      throw new HttpException(
        `Error al crear el ternero: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // LISTAR TERNEROS (con filtro por establecimiento)
  // ============================================================
  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
    idEstablecimientoQuery?: number | null,
    sinRodeo?: boolean,
    idRodeo?: number | null,
    estado?: string | null,
    page: number = 1,
    limit: number = 20,
    search?: string | null,
  ): Promise<any> {
    try {

      const query = this.terneroRepository
        .createQueryBuilder('ternero')
        .leftJoinAndSelect('ternero.madre', 'madre')
        .leftJoinAndSelect('ternero.eventos', 'eventos');

      // 🧩 Multi-tenancy
      if (esAdmin) {
        const filterId = idEstablecimientoQuery || idEstablecimiento;
        if (filterId) {
          query.where('ternero.id_establecimiento = :idEstablecimiento', {
            idEstablecimiento: filterId,
          });
        }
      } else if (idEstablecimiento) {
        query.where('ternero.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      } else {
        this.logger.warn('Usuario sin establecimiento asignado');
      }

      // 🐮 Filtros opcionales
      if (sinRodeo) {
        query.andWhere('ternero.id_rodeo IS NULL');
      }

      if (idRodeo) {
        query.andWhere('ternero.id_rodeo = :idRodeo', { idRodeo });
      }

      if (estado) {
        query.andWhere('ternero.estado = :estado', { estado });
      }

      // Búsqueda por RP
      if (search) {
        query.andWhere(
          '(CAST(ternero.rp_ternero AS TEXT) LIKE :search OR CAST(madre.rp_madre AS TEXT) LIKE :search)',
          { search: `%${search}%` },
        );
      }

      const [terneroList, total] = await query
        .orderBy('ternero.id_ternero', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();


      const data = terneroList.map((ternero) => {
        try {
          ternero.calcularIndicadoresCrecimiento();
        } catch (error) {
          this.logger.error(
            `Error calculando indicadores para ternero ID ${ternero.id_ternero}`,
            error,
          );
          ternero.dias_desde_nacimiento = 0;
          ternero.ultimo_peso = ternero.peso_nacer;
          ternero.aumento_diario_promedio = 0;
        }
        return ternero;
      });

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Error en findAll terneros', error);
      throw new HttpException(
        `Error al obtener los terneros: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // BUSCAR UN TERNERO (validar propiedad)
  // ============================================================
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TerneroEntity> {
    try {
      const query = this.terneroRepository
        .createQueryBuilder('ternero')
        .leftJoinAndSelect('ternero.madre', 'madre')
        .leftJoinAndSelect('ternero.eventos', 'eventos')
        .where('ternero.id_ternero = :id', { id });

      // Si NO es admin, validar establecimiento
      if (!esAdmin && idEstablecimiento) {
        query.andWhere('ternero.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      }

      const ternero = await query.getOne();

      if (!ternero) {
        throw new NotFoundException(
          'Ternero no encontrado o no pertenece a su establecimiento',
        );
      }

      try {
        ternero.calcularIndicadoresCrecimiento();
      } catch (error) {
        this.logger.error('Error calculando indicadores en findOne', error);
        ternero.dias_desde_nacimiento = 0;
        ternero.ultimo_peso = ternero.peso_nacer;
        ternero.aumento_diario_promedio = 0;
      }

      return ternero;
    } catch (error) {
      throw new HttpException(
        `Error al obtener el ternero con el ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ACTUALIZAR TERNERO (validar propiedad)
  // ============================================================
  async update(
    id: number,
    updateTerneroDto: UpdateTerneroDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TerneroEntity> {
    try {
      // Validar que el ternero existe y pertenece al establecimiento
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);

      // Si el DTO contiene un nuevo id_madre, validar que esté en el mismo establecimiento
      if (updateTerneroDto.id_madre) {
        const nuevaMadre = await this.madreRepository.findOne({
          where: {
            id_madre: updateTerneroDto.id_madre,
            id_establecimiento: ternero.id_establecimiento,
          },
        });

        if (!nuevaMadre) {
          throw new HttpException(
            'La nueva madre no existe en este establecimiento',
            HttpStatus.NOT_FOUND,
          );
        }

        ternero.madre = nuevaMadre;
      }

      // No permitir cambiar el establecimiento
      if (updateTerneroDto['id_establecimiento']) {
        delete updateTerneroDto['id_establecimiento'];
      }

      // Manejar conversión de fechas
      if (updateTerneroDto.fecha_nacimiento) {
        ternero.fecha_nacimiento = new Date(updateTerneroDto.fecha_nacimiento);
      }

      if (updateTerneroDto.fecha_hora_calostrado) {
        ternero.fecha_hora_calostrado = new Date(
          updateTerneroDto.fecha_hora_calostrado,
        );
      }

      const {
        fecha_nacimiento,
        fecha_hora_calostrado,
        id_madre,
        ...otrosCampos
      } = updateTerneroDto;
      Object.assign(ternero, otrosCampos);

      const terneroActualizado = await this.terneroRepository.save(ternero);

      try {
        terneroActualizado.calcularIndicadoresCrecimiento();
      } catch (error) {
        this.logger.error('Error calculando indicadores en update', error);
        terneroActualizado.dias_desde_nacimiento = 0;
        terneroActualizado.ultimo_peso = terneroActualizado.peso_nacer;
        terneroActualizado.aumento_diario_promedio = 0;
      }

      return terneroActualizado;
    } catch (error) {
      throw new HttpException(
        `Error al actualizar el ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ELIMINAR TERNERO (validar propiedad)
  // ============================================================
  async remove(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<{ message: string }> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);
      await this.terneroRepository.remove(ternero);
      return { message: 'Ternero eliminado con éxito' };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar el ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // ACTUALIZAR CALOSTRADO
  // ============================================================
  async actualizarCalostrado(
    id: number,
    updateCalostradoDto: UpdateCalostradoDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<any> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);

      if (updateCalostradoDto.metodo_calostrado !== undefined) {
        ternero.metodo_calostrado = updateCalostradoDto.metodo_calostrado;
      }
      if (updateCalostradoDto.litros_calostrado !== undefined) {
        ternero.litros_calostrado = updateCalostradoDto.litros_calostrado;
      }
      if (updateCalostradoDto.fecha_hora_calostrado !== undefined) {
        ternero.fecha_hora_calostrado = new Date(
          updateCalostradoDto.fecha_hora_calostrado,
        );
      }
      if (updateCalostradoDto.observaciones_calostrado !== undefined) {
        ternero.observaciones_calostrado =
          updateCalostradoDto.observaciones_calostrado;
      }
      if (updateCalostradoDto.grado_brix !== undefined) {
        ternero.grado_brix = updateCalostradoDto.grado_brix;
      }

      const terneroActualizado = await this.terneroRepository.save(ternero);

      return {
        id_ternero: terneroActualizado.id_ternero,
        rp_ternero: terneroActualizado.rp_ternero,
        metodo_calostrado: terneroActualizado.metodo_calostrado,
        litros_calostrado: terneroActualizado.litros_calostrado,
        fecha_hora_calostrado: terneroActualizado.fecha_hora_calostrado,
        observaciones_calostrado: terneroActualizado.observaciones_calostrado,
        grado_brix: terneroActualizado.grado_brix,
        message: 'Datos de calostrado actualizados exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        `Error al actualizar calostrado del ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // AGREGAR PESO DIARIO
  // ============================================================
  async agregarPesoDiario(
    id: number,
    addPesoDiarioDto: AddPesoDiarioDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TerneroEntity> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);

      const fecha = addPesoDiarioDto.fecha
        ? new Date(addPesoDiarioDto.fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
          })
        : new Date().toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
          });

      ternero.agregarPesaje(fecha, addPesoDiarioDto.peso_actual);
      const terneroActualizado = await this.terneroRepository.save(ternero);
      terneroActualizado.calcularIndicadoresCrecimiento();

      return terneroActualizado;
    } catch (error) {
      throw new HttpException(
        `Error al agregar peso diario al ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // OBTENER HISTORIAL COMPLETO
  // ============================================================
  async obtenerHistorialCompleto(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<HistorialPesosResponseDto> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);
      ternero.calcularIndicadoresCrecimiento();

      const historialPesos = ternero.obtenerHistorialPesajes();
      const ultimoPeso = ternero.obtenerUltimoPeso();
      const gananciaTotal = ultimoPeso.peso - ternero.peso_nacer;

      const response: HistorialPesosResponseDto = {
        id_ternero: ternero.id_ternero,
        rp_ternero: ternero.rp_ternero,
        peso_nacer: ternero.peso_nacer,
        ultimo_peso: ultimoPeso.peso,
        ultimo_pesaje_fecha: ultimoPeso.fecha,
        historial_pesos: historialPesos,
        ganancia_total: parseFloat(gananciaTotal.toFixed(2)),
        aumento_diario_promedio: ternero.aumento_diario_promedio,
        dias_desde_nacimiento: ternero.dias_desde_nacimiento,
      };

      return response;
    } catch (error) {
      throw new HttpException(
        `Error al obtener historial completo del ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // MÉTODOS DE COMPATIBILIDAD (para no romper código existente)
  // ============================================================
  async agregarPesaje(
    id: number,
    fecha: string,
    peso: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
    observaciones?: string,
  ): Promise<TerneroEntity> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);
      ternero.agregarPesaje(fecha, peso);
      const terneroActualizado = await this.terneroRepository.save(ternero);
      terneroActualizado.calcularIndicadoresCrecimiento();
      return terneroActualizado;
    } catch (error) {
      if (error instanceof HttpException || error instanceof ForbiddenException) throw error;
      throw new HttpException(
        `Error al agregar pesaje al ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async obtenerHistorialPesajes(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<Array<{ fecha: string; peso: number }>> {
    try {
      const ternero = await this.findOne(id, idEstablecimiento, esAdmin);
      return ternero.obtenerHistorialPesajes();
    } catch (error) {
      if (error instanceof HttpException || error instanceof ForbiddenException) throw error;
      throw new HttpException(
        `Error al obtener historial de pesajes del ternero con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
