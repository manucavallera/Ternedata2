import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateTratamientoDto,
  CreateMultiplesTratamientosDto,
  CreateMultiplesTratamientosResponseDto,
  TurnoTratamiento,
} from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TratamientoEntity } from './entities/tratamiento.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity'; // ← NUEVA IMPORTACIÓN
import { Repository } from 'typeorm';

@Injectable()
export class TratamientosService {
  constructor(
    @InjectRepository(TratamientoEntity)
    private readonly tratamientoRepository: Repository<TratamientoEntity>,
    // ← NUEVA INYECCIÓN
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
  ) {}

  async create(
    createTratamientoDto: CreateTratamientoDto,
  ): Promise<TratamientoEntity> {
    try {
      // ← NUEVA LÓGICA: Buscar ternero si viene id_ternero
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
      }

      // ← MODIFICADO: Crear tratamiento con relación al ternero
      const resCreateTratamiento = this.tratamientoRepository.create({
        nombre: createTratamientoDto.nombre,
        descripcion: createTratamientoDto.descripcion,
        tipo_enfermedad: createTratamientoDto.tipo_enfermedad,
        turno: createTratamientoDto.turno,
        fecha_tratamiento: new Date(createTratamientoDto.fecha_tratamiento),
        ternero: ternero,
      });

      const tratamientoSave =
        await this.tratamientoRepository.save(resCreateTratamiento);
      return tratamientoSave;
    } catch (error) {
      throw new HttpException(
        `Error al crear el tratamiento: ${error.message}`,
        HttpStatus.CONFLICT,
      );
    }
  }

  // MÃ©todo para crear mÃºltiples tratamientos - ACTUALIZADO
  async createMultiples(
    createMultiplesTratamientosDto: CreateMultiplesTratamientosDto,
  ): Promise<CreateMultiplesTratamientosResponseDto> {
    const tratamientosCreados = [];
    const errores = [];
    let totalCreados = 0;

    try {
      console.log('Creando múltiples tratamientos:', {
        cantidad: createMultiplesTratamientosDto.tratamientos.length,
        tratamientos: createMultiplesTratamientosDto.tratamientos.map(
          (t) => t.nombre,
        ),
      });

      for (const [
        index,
        tratamientoData,
      ] of createMultiplesTratamientosDto.tratamientos.entries()) {
        try {
          // ← NUEVA LÓGICA: Buscar ternero si viene en el tratamiento
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
          }

          // Validar que la fecha sea válida
          if (tratamientoData.fecha_tratamiento) {
            tratamientoData.fecha_tratamiento = new Date(
              tratamientoData.fecha_tratamiento,
            )
              .toISOString()
              .split('T')[0];
          }

          // ← MODIFICADO: Crear el tratamiento con relación
          const nuevoTratamiento = this.tratamientoRepository.create({
            nombre: tratamientoData.nombre,
            descripcion: tratamientoData.descripcion,
            tipo_enfermedad: tratamientoData.tipo_enfermedad,
            turno: tratamientoData.turno,
            fecha_tratamiento: new Date(tratamientoData.fecha_tratamiento),
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

          console.log(
            `Tratamiento ${index + 1} creado: ${tratamientoGuardado.nombre} (ID: ${tratamientoGuardado.id_tratamiento})`,
          );
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

      console.log('Resultado final:', {
        total_creados: totalCreados,
        total_errores: errores.length,
        mensaje: response.mensaje,
      });

      return response;
    } catch (error) {
      console.error('Error general en createMultiples:', error);
      throw new HttpException(
        `Error al crear múltiples tratamientos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ← MODIFICADO: findAll ahora incluye relación con terneros
  async findAll(
    tipo_enfermedad?: string,
    turno?: TurnoTratamiento,
  ): Promise<TratamientoEntity[]> {
    try {
      const queryBuilder = this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero') // ← NUEVA RELACIÓN
        .leftJoinAndSelect(
          'tratamiento.ternerosTratamientos',
          'ternerosTratamientos',
        );

      if (tipo_enfermedad) {
        queryBuilder.andWhere(
          'tratamiento.tipo_enfermedad ILIKE :tipo_enfermedad',
          { tipo_enfermedad: `%${tipo_enfermedad}%` },
        );
      }

      if (turno) {
        queryBuilder.andWhere('tratamiento.turno = :turno', { turno });
      }

      const tratamientosArray = await queryBuilder.getMany();
      return tratamientosArray;
    } catch (error) {
      throw new HttpException(
        `Error al obtener los tratamientos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: number): Promise<TratamientoEntity> {
    try {
      const tratamiento = await this.tratamientoRepository.findOne({
        where: { id_tratamiento: id },
        relations: ['ternero', 'ternerosTratamientos'], // ← AGREGADA RELACIÓN
      });

      if (!tratamiento) {
        throw new HttpException(
          'Tratamiento no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      return tratamiento;
    } catch (error) {
      throw new HttpException(
        `Error al obtener el tratamiento con el ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    updateTratamientoDto: UpdateTratamientoDto,
  ): Promise<TratamientoEntity> {
    try {
      const tratamiento = await this.tratamientoRepository.findOne({
        where: { id_tratamiento: id },
      });

      if (!tratamiento) {
        throw new HttpException(
          'Tratamiento no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      // ← NUEVA LÓGICA: Si viene id_ternero en la actualización
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

        tratamiento.ternero = ternero;
      }

      await this.tratamientoRepository.update(
        { id_tratamiento: id },
        updateTratamientoDto,
      );

      const updatedTratamiento = await this.tratamientoRepository.findOne({
        where: { id_tratamiento: id },
        relations: ['ternero', 'ternerosTratamientos'], // ← AGREGADA RELACIÓN
      });

      return updatedTratamiento!;
    } catch (error) {
      throw new HttpException(
        `Error al actualizar el tratamiento con ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      const tratamiento = await this.tratamientoRepository.findOne({
        where: { id_tratamiento: id },
      });

      if (!tratamiento) {
        throw new HttpException(
          'Tratamiento no encontrado',
          HttpStatus.NOT_FOUND,
        );
      }

      await this.tratamientoRepository.remove(tratamiento);

      return {
        message: 'Tratamiento eliminado con éxito',
      };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar el tratamiento con el ID ${id}: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ← MODIFICADO: Incluir relación con terneros
  async findByTipoEnfermedad(
    tipoEnfermedad: string,
  ): Promise<TratamientoEntity[]> {
    try {
      const tratamientos = await this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero') // ← NUEVA RELACIÓN
        .leftJoinAndSelect(
          'tratamiento.ternerosTratamientos',
          'ternerosTratamientos',
        )
        .where('tratamiento.tipo_enfermedad ILIKE :tipoEnfermedad', {
          tipoEnfermedad: `%${tipoEnfermedad}%`,
        })
        .getMany();

      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por tipo de enfermedad: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByTurno(turno: TurnoTratamiento): Promise<TratamientoEntity[]> {
    try {
      const tratamientos = await this.tratamientoRepository.find({
        where: { turno },
        relations: ['ternero', 'ternerosTratamientos'], // ← AGREGADA RELACIÓN
      });
      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por turno: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ← MODIFICADO: Incluir relación con terneros
  async findByTipoEnfermedadYTurno(
    tipo_enfermedad: string,
    turno: TurnoTratamiento,
  ): Promise<TratamientoEntity[]> {
    try {
      const tratamientos = await this.tratamientoRepository
        .createQueryBuilder('tratamiento')
        .leftJoinAndSelect('tratamiento.ternero', 'ternero') // ← NUEVA RELACIÓN
        .leftJoinAndSelect(
          'tratamiento.ternerosTratamientos',
          'ternerosTratamientos',
        )
        .where('tratamiento.tipo_enfermedad ILIKE :tipo_enfermedad', {
          tipo_enfermedad: `%${tipo_enfermedad}%`,
        })
        .andWhere('tratamiento.turno = :turno', { turno })
        .getMany();

      return tratamientos;
    } catch (error) {
      throw new HttpException(
        `Error al obtener tratamientos por tipo de enfermedad y turno: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
