import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateTratamientoDto,
  CreateMultiplesTratamientosDto,
  CreateMultiplesTratamientosResponseDto,
  TurnoTratamiento,
} from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TratamientoEntity } from './entities/tratamiento.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TratamientosService {
  constructor(
    @InjectRepository(TratamientoEntity)
    private readonly tratamientoRepository: Repository<TratamientoEntity>,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
  ) {}

  // ✅ CREATE con multi-tenancy
  async create(
    createTratamientoDto: CreateTratamientoDto & { id_establecimiento: number },
  ): Promise<TratamientoEntity> {
    try {
      // Validar que venga el establecimiento
      if (!createTratamientoDto.id_establecimiento) {
        throw new ForbiddenException(
          'Usuario sin establecimiento asignado. No puede crear tratamientos.',
        );
      }

      // Buscar ternero si viene id_ternero
      let ternero = null;
      if (createTratamientoDto.id_ternero) {
        ternero = await this.terneroRepository.findOne({
          where: { id_ternero: createTratamientoDto.id_ternero },
        });

        if (!ternero) {
          throw new HttpException(
            'Ternero no encontrado',
            HttpStatus.NOT_FOUND,
          );
        }

        // Validar que el ternero pertenezca al mismo establecimiento
        if (
          ternero.id_establecimiento !== createTratamientoDto.id_establecimiento
        ) {
          throw new ForbiddenException(
            'El ternero no pertenece a su establecimiento',
          );
        }
      }

      // Crear tratamiento con establecimiento
      const resCreateTratamiento = this.tratamientoRepository.create({
        nombre: createTratamientoDto.nombre,
        descripcion: createTratamientoDto.descripcion,
        tipo_enfermedad: createTratamientoDto.tipo_enfermedad,
        turno: createTratamientoDto.turno,
        fecha_tratamiento: new Date(createTratamientoDto.fecha_tratamiento),
        id_establecimiento: createTratamientoDto.id_establecimiento,
        ternero: ternero,
      });

      const tratamientoSave =
        await this.tratamientoRepository.save(resCreateTratamiento);
      return tratamientoSave;
    } catch (error) {
      throw new HttpException(
        `Error al crear el tratamiento: ${error.message}`,
        error.status || HttpStatus.CONFLICT,
      );
    }
  }

  // ✅ CREATE MÚLTIPLES con multi-tenancy
  async createMultiples(
    createMultiplesTratamientosDto: CreateMultiplesTratamientosDto & {
      id_establecimiento: number;
    },
  ): Promise<CreateMultiplesTratamientosResponseDto> {
    const tratamientosCreados = [];
    const errores = [];
    let totalCreados = 0;

    try {
      // Validar que venga el establecimiento
      if (!createMultiplesTratamientosDto.id_establecimiento) {
        throw new ForbiddenException(
          'Usuario sin establecimiento asignado. No puede crear tratamientos.',
        );
      }

      console.log('Creando múltiples tratamientos:', {
        cantidad: createMultiplesTratamientosDto.tratamientos.length,
        establecimiento: createMultiplesTratamientosDto.id_establecimiento,
      });

      for (const [
        index,
        tratamientoData,
      ] of createMultiplesTratamientosDto.tratamientos.entries()) {
        try {
          // Buscar ternero si viene en el tratamiento
          let ternero = null;
          if (tratamientoData.id_ternero) {
            ternero = await this.terneroRepository.findOne({
              where: { id_ternero: tratamientoData.id_ternero },
            });

            if (!ternero) {
              throw new Error(
                `Ternero con ID ${tratamientoData.id_ternero} no encontrado`,
              );
            }

            // Validar establecimiento del ternero
            if (
              ternero.id_establecimiento !==
              createMultiplesTratamientosDto.id_establecimiento
            ) {
              throw new Error(
                `El ternero ${tratamientoData.id_ternero} no pertenece a su establecimiento`,
              );
            }
          }

          // Validar fecha
          if (tratamientoData.fecha_tratamiento) {
            tratamientoData.fecha_tratamiento = new Date(
              tratamientoData.fecha_tratamiento,
            )
              .toISOString()
              .split('T')[0];
          }

          // Crear el tratamiento con establecimiento
          const nuevoTratamiento = this.tratamientoRepository.create({
            nombre: tratamientoData.nombre,
            descripcion: tratamientoData.descripcion,
            tipo_enfermedad: tratamientoData.tipo_enfermedad,
            turno: tratamientoData.turno,
            fecha_tratamiento: new Date(tratamientoData.fecha_tratamiento),
            id_establecimiento:
              createMultiplesTratamientosDto.id_establecimiento,
            ternero: ternero,
          });

          const tratamientoGuardado =
            await this.tratamientoRepository.save(nuevoTratamiento);

          tratamientosCreados.push({
            id_tratamiento: tratamientoGuardado.id_tratamiento,
            nombre: tratamientoGuardado.nombre,
            tipo_enfermedad: tratamientoGuardado.tipo_enfermedad,
            turno: tratamientoGuardado.turno,
            fecha_tratamiento: tratamientoGuardado.fecha_tratamiento,
            id_ternero: ternero?.id_ternero || null,
          });

          totalCreados++;
        } catch (error) {
          console.error(
            `Error creando tratamiento ${index + 1} (${tratamientoData.nombre}):`,
            error.message,
          );

          errores.push({
            tratamiento: tratamientoData.nombre,
            posicion: index + 1,
            error: error.message || 'Error desconocido al crear el tratamiento',
            datos: tratamientoData,
          });
        }
      }

      const response: CreateMultiplesTratamientosResponseDto = {
        total_creados: totalCreados,
        tratamientos_creados: tratamientosCreados,
        mensaje: `Se crearon ${totalCreados} de ${createMultiplesTratamientosDto.tratamientos.length} tratamientos`,
      };

      if (errores.length > 0) {
        response.errores = errores;
        response.mensaje += `. ${errores.length} tratamientos fallaron.`;
      } else {
        response.mensaje += ' exitosamente.';
      }

      return response;
    } catch (error) {
      console.error('Error general en createMultiples:', error);
      throw new HttpException(
        `Error al crear múltiples tratamientos: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND ALL con multi-tenancy
 // ✅ FIND ALL con multi-tenancy
async findAll(
  idEstablecimiento: number | null,
  esAdmin: boolean,
  idEstablecimientoQuery?: number | null,  // ⬅️ NUEVO PARÁMETRO
  tipo_enfermedad?: string,
  turno?: TurnoTratamiento,
): Promise<TratamientoEntity[]> {
  try {
    console.log(
      '🔍 Service Tratamientos findAll - ID Usuario:',
      idEstablecimiento,
      'Es Admin:',
      esAdmin,
      'Query Params:',
      { establecimiento: idEstablecimientoQuery, tipo_enfermedad, turno },
    );

    const queryBuilder = this.tratamientoRepository
      .createQueryBuilder('tratamiento')
      .leftJoinAndSelect('tratamiento.ternero', 'ternero');

    // Lógica de filtrado por establecimiento
    if (esAdmin) {
      // Si es admin Y tiene query param, filtrar por ese establecimiento
      if (idEstablecimientoQuery) {
        console.log(
          '✅ Admin filtrando tratamientos por establecimiento:',
          idEstablecimientoQuery,
        );
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento: idEstablecimientoQuery },
        );
      } else {
        console.log('✅ Admin viendo TODOS los tratamientos (sin filtro de establecimiento)');
        // No agregar ningún where de establecimiento - devuelve todo
      }
    } else {
      // Si NO es admin, SIEMPRE filtrar por su establecimiento
      if (idEstablecimiento) {
        console.log(
          '✅ Usuario no-admin, filtrando tratamientos por su establecimiento:',
          idEstablecimiento,
        );
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      } else {
        console.warn('⚠️ Usuario no-admin sin establecimiento asignado');
      }
    }

    // Filtros adicionales opcionales
    if (tipo_enfermedad) {
      console.log('🦠 Filtrando por enfermedad:', tipo_enfermedad);
      queryBuilder.andWhere(
        'tratamiento.tipo_enfermedad ILIKE :tipo_enfermedad',
        { tipo_enfermedad: `%${tipo_enfermedad}%` },
      );
    }

    if (turno) {
      console.log('🕐 Filtrando por turno:', turno);
      queryBuilder.andWhere('tratamiento.turno = :turno', { turno });
    }

    const tratamientosArray = await queryBuilder.getMany();

    console.log('✅ Encontrados', tratamientosArray.length, 'tratamientos');
    console.log('📊 Desglose:', {
      total: tratamientosArray.length,
      turnos: tratamientosArray.map((t) => ({
        id: t.id_tratamiento,
        nombre: t.nombre,
        turno: t.turno,
        establecimiento: t.id_establecimiento,
      })),
    });

    return tratamientosArray;
  } catch (error) {
    console.error('Error en findAll tratamientos:', error);
    throw new HttpException(
      `Error al obtener los tratamientos: ${error.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

## ✅ **Checklist:**

- ✅ Controller: Agregar `@Query('id_establecimiento')` en método `findAll`
- ✅ Controller: Mover `@Req() req` al primer parámetro
- ✅ Controller: Pasar `establecimientoFiltro` como tercer parámetro al service
- ✅ Service: Agregar tercer parámetro `idEstablecimientoQuery?: number | null`
- ✅ Service: Implementar lógica de filtrado condicional por establecimiento
- ✅ Service: Mantener filtros opcionales de `tipo_enfermedad` y `turno`

---

## 🧪 **Logs esperados:**

**Admin viendo todos los tratamientos:**
```
🔍 Controller Tratamientos - ID del usuario: null Es Admin: true
📥 Query Params recibidos: { establecimiento: null, tipo_enfermedad: undefined, turno: undefined }
🔍 Service Tratamientos findAll - ID Usuario: null Es Admin: true Query Params: { establecimiento: null, tipo_enfermedad: undefined, turno: undefined }
✅ Admin viendo TODOS los tratamientos (sin filtro de establecimiento)
✅ Encontrados X tratamientos
```

**Admin filtrando por Establecimiento Sur + turno mañana:**
```
🔍 Controller Tratamientos - ID del usuario: null Es Admin: true
📥 Query Params recibidos: { establecimiento: 2, tipo_enfermedad: undefined, turno: 'mañana' }
🔍 Service Tratamientos findAll - ID Usuario: null Es Admin: true Query Params: { establecimiento: 2, tipo_enfermedad: undefined, turno: 'mañana' }
✅ Admin filtrando tratamientos por establecimiento: 2
🕐 Filtrando por turno: mañana
✅ Encontrados 1 tratamientos
  // ✅ FIND ONE con multi-tenancy
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TratamientoEntity> {
    try {
      const queryBuilder = this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero')
        .where('tratamiento.id_tratamiento = :id', { id });

      // Filtrar por establecimiento (solo si NO es admin)
      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const tratamiento = await queryBuilder.getOne();

      if (!tratamiento) {
        throw new NotFoundException(
          'Tratamiento no encontrado o no pertenece a su establecimiento',
        );
      }

      return tratamiento;
    } catch (error) {
      throw new HttpException(
        `Error al obtener el tratamiento con el ID ${id}: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ UPDATE con multi-tenancy
  async update(
    id: number,
    updateTratamientoDto: UpdateTratamientoDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TratamientoEntity> {
    try {
      // Verificar que el tratamiento existe y pertenece al establecimiento
      const tratamiento = await this.findOne(id, idEstablecimiento, esAdmin);

      // No permitir cambiar el establecimiento
      if (updateTratamientoDto['id_establecimiento']) {
        delete updateTratamientoDto['id_establecimiento'];
      }

      // Si viene id_ternero en la actualización
      if (updateTratamientoDto.id_ternero) {
        const ternero = await this.terneroRepository.findOne({
          where: { id_ternero: updateTratamientoDto.id_ternero },
        });

        if (!ternero) {
          throw new HttpException(
            'Ternero no encontrado',
            HttpStatus.NOT_FOUND,
          );
        }

        // Validar que el ternero pertenezca al mismo establecimiento
        if (
          !esAdmin &&
          ternero.id_establecimiento !== tratamiento.id_establecimiento
        ) {
          throw new ForbiddenException(
            'El ternero no pertenece a su establecimiento',
          );
        }

        tratamiento.ternero = ternero;
      }

      // Actualizar campos
      Object.assign(tratamiento, updateTratamientoDto);

      const updatedTratamiento =
        await this.tratamientoRepository.save(tratamiento);

      return updatedTratamiento;
    } catch (error) {
      throw new HttpException(
        `Error al actualizar el tratamiento con ID ${id}: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
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
      // Verificar que el tratamiento existe y pertenece al establecimiento
      const tratamiento = await this.findOne(id, idEstablecimiento, esAdmin);

      await this.tratamientoRepository.remove(tratamiento);

      return {
        message: 'Tratamiento eliminado con éxito',
      };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar el tratamiento con el ID ${id}: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND BY TIPO ENFERMEDAD con multi-tenancy
  async findByTipoEnfermedad(
    tipoEnfermedad: string,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TratamientoEntity[]> {
    try {
      const queryBuilder = this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero')
        .where('tratamiento.tipo_enfermedad ILIKE :tipoEnfermedad', {
          tipoEnfermedad: `%${tipoEnfermedad}%`,
        });

      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const tratamientos = await queryBuilder.getMany();
      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por tipo de enfermedad: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND BY TURNO con multi-tenancy
  async findByTurno(
    turno: TurnoTratamiento,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TratamientoEntity[]> {
    try {
      const queryBuilder = this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero')
        .where('tratamiento.turno = :turno', { turno });

      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const tratamientos = await queryBuilder.getMany();
      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por turno: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND BY TIPO ENFERMEDAD Y TURNO con multi-tenancy
  async findByTipoEnfermedadYTurno(
    tipo_enfermedad: string,
    turno: TurnoTratamiento,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<TratamientoEntity[]> {
    try {
      const queryBuilder = this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero')
        .where('tratamiento.tipo_enfermedad ILIKE :tipo_enfermedad', {
          tipo_enfermedad: `%${tipo_enfermedad}%`,
        })
        .andWhere('tratamiento.turno = :turno', { turno });

      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'tratamiento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const tratamientos = await queryBuilder.getMany();
      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por tipo de enfermedad y turno: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
