import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateEventoDto } from './dto/create-evento.dto';
import { CreateMultipleEventosDto } from './dto/create-multiple-eventos.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { EventoEntity } from './entities/evento.entity';
import { In, Repository } from 'typeorm';
import { MadreEntity } from '../madres/entities/madre.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';

@Injectable()
export class EventosService {
  constructor(
    @InjectRepository(EventoEntity)
    private readonly eventoRepository: Repository<EventoEntity>,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepository: Repository<MadreEntity>,
  ) {}

  // ✅ CREATE con multi-tenancy
  async create(
    createEventoDto: CreateEventoDto & { id_establecimiento: number },
  ): Promise<EventoEntity> {
    try {
      // Validar que venga el establecimiento
      if (!createEventoDto.id_establecimiento) {
        throw new ForbiddenException(
          'Usuario sin establecimiento asignado. No puede crear eventos.',
        );
      }

      // Buscar todos los terneros con los IDs proporcionados
      const terneros = createEventoDto.id_ternero
        ? await this.terneroRepository.findBy({
            id_ternero: In(createEventoDto.id_ternero),
          })
        : [];

      // Validar que todos los terneros pertenezcan al mismo establecimiento
      if (terneros.length > 0) {
        const ternerosDeOtroEstablecimiento = terneros.filter(
          (ternero) =>
            ternero.id_establecimiento !== createEventoDto.id_establecimiento,
        );

        if (ternerosDeOtroEstablecimiento.length > 0) {
          throw new ForbiddenException(
            `Algunos terneros no pertenecen a su establecimiento: ${ternerosDeOtroEstablecimiento.map((t) => t.id_ternero).join(', ')}`,
          );
        }
      }

      // Buscar todas las madres con los IDs proporcionados
      const madres = createEventoDto.id_madre
        ? await this.madreRepository.findBy({
            id_madre: In(createEventoDto.id_madre),
          })
        : [];

      // Validar que todas las madres pertenezcan al mismo establecimiento
      if (madres.length > 0) {
        const madresDeOtroEstablecimiento = madres.filter(
          (madre) =>
            madre.id_establecimiento !== createEventoDto.id_establecimiento,
        );

        if (madresDeOtroEstablecimiento.length > 0) {
          throw new ForbiddenException(
            `Algunas madres no pertenecen a su establecimiento: ${madresDeOtroEstablecimiento.map((m) => m.id_madre).join(', ')}`,
          );
        }
      }

      // Crear el evento con los datos proporcionados
      const eventoCreated = this.eventoRepository.create({
        fecha_evento: createEventoDto.fecha_evento,
        observacion: createEventoDto.observacion,
        id_establecimiento: createEventoDto.id_establecimiento,
        terneros,
        madres,
      });

      return await this.eventoRepository.save(eventoCreated);
    } catch (error) {
      throw new HttpException(
        `Error al crear el evento: ${error.message}`,
        error.status || HttpStatus.CONFLICT,
      );
    }
  }

  // ✅ CREATE MÚLTIPLES con multi-tenancy
  async createMultiple(
    createEventosData: CreateMultipleEventosDto & {
      id_establecimiento: number;
    },
  ): Promise<EventoEntity[]> {
    try {
      if (!createEventosData.id_establecimiento) {
        throw new ForbiddenException(
          'Usuario sin establecimiento asignado. No puede crear eventos.',
        );
      }

      const eventosCreados: EventoEntity[] = [];

      for (const eventoDto of createEventosData.eventos) {
        const terneros =
          eventoDto.id_ternero?.length > 0
            ? await this.terneroRepository.findBy({
                id_ternero: In(eventoDto.id_ternero),
              })
            : [];

        if (terneros.length > 0) {
          const ternerosDeOtroEstablecimiento = terneros.filter(
            (ternero) =>
              ternero.id_establecimiento !==
              createEventosData.id_establecimiento,
          );

          if (ternerosDeOtroEstablecimiento.length > 0) {
            throw new ForbiddenException(
              `Algunos terneros no pertenecen a su establecimiento: ${ternerosDeOtroEstablecimiento.map((t) => t.id_ternero).join(', ')}`,
            );
          }
        }

        const madres =
          eventoDto.id_madre?.length > 0
            ? await this.madreRepository.findBy({
                id_madre: In(eventoDto.id_madre),
              })
            : [];

        if (madres.length > 0) {
          const madresDeOtroEstablecimiento = madres.filter(
            (madre) =>
              madre.id_establecimiento !== createEventosData.id_establecimiento,
          );

          if (madresDeOtroEstablecimiento.length > 0) {
            throw new ForbiddenException(
              `Algunas madres no pertenecen a su establecimiento: ${madresDeOtroEstablecimiento.map((m) => m.id_madre).join(', ')}`,
            );
          }
        }

        const eventoCreado = this.eventoRepository.create({
          fecha_evento: eventoDto.fecha_evento,
          observacion: eventoDto.observacion,
          id_establecimiento: createEventosData.id_establecimiento,
          terneros,
          madres,
        });

        const eventoGuardado = await this.eventoRepository.save(eventoCreado);
        eventosCreados.push(eventoGuardado);
      }

      return eventosCreados;
    } catch (error) {
      throw new HttpException(
        `Error al crear múltiples eventos: ${error.message}`,
        error.status || HttpStatus.CONFLICT,
      );
    }
  }

  // ✅ FIND ALL con multi-tenancy
  async findAll(
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<EventoEntity[]> {
    try {
      const queryBuilder = this.eventoRepository
        .createQueryBuilder('evento')
        .leftJoinAndSelect('evento.terneros', 'terneros')
        .leftJoinAndSelect('evento.madres', 'madres');

      if (!esAdmin && idEstablecimiento) {
        queryBuilder.where('evento.id_establecimiento = :idEstablecimiento', {
          idEstablecimiento,
        });
      }

      return await queryBuilder.getMany();
    } catch (error) {
      throw new HttpException(
        `Error al obtener los eventos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ FIND ONE con multi-tenancy
  async findOne(
    id: number,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<EventoEntity> {
    try {
      const queryBuilder = this.eventoRepository
        .createQueryBuilder('evento')
        .leftJoinAndSelect('evento.terneros', 'terneros')
        .leftJoinAndSelect('evento.madres', 'madres')
        .where('evento.id_evento = :id', { id });

      if (!esAdmin && idEstablecimiento) {
        queryBuilder.andWhere(
          'evento.id_establecimiento = :idEstablecimiento',
          { idEstablecimiento },
        );
      }

      const evento = await queryBuilder.getOne();

      if (!evento) {
        throw new NotFoundException(
          'Evento no encontrado o no pertenece a su establecimiento',
        );
      }

      return evento;
    } catch (error) {
      throw new HttpException(
        `Error al obtener el evento con ID ${id}: ${error.message}`,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ✅ UPDATE con multi-tenancy
  async update(
    id: number,
    updateEventoDto: UpdateEventoDto,
    idEstablecimiento: number | null,
    esAdmin: boolean,
  ): Promise<EventoEntity> {
    try {
      const evento = await this.findOne(id, idEstablecimiento, esAdmin);

      if (updateEventoDto['id_establecimiento']) {
        delete updateEventoDto['id_establecimiento'];
      }

      const ternerosArray = updateEventoDto.id_ternero
        ? await this.terneroRepository.findBy({
            id_ternero: In(updateEventoDto.id_ternero),
          })
        : [];

      if (ternerosArray.length > 0 && !esAdmin) {
        const ternerosDeOtroEstablecimiento = ternerosArray.filter(
          (ternero) => ternero.id_establecimiento !== evento.id_establecimiento,
        );

        if (ternerosDeOtroEstablecimiento.length > 0) {
          throw new ForbiddenException(
            `Algunos terneros no pertenecen a su establecimiento: ${ternerosDeOtroEstablecimiento.map((t) => t.id_ternero).join(', ')}`,
          );
        }
      }

      const madresArray = updateEventoDto.id_madre
        ? await this.madreRepository.findBy({
            id_madre: In(updateEventoDto.id_madre),
          })
        : [];

      if (madresArray.length > 0 && !esAdmin) {
        const madresDeOtroEstablecimiento = madresArray.filter(
          (madre) => madre.id_establecimiento !== evento.id_establecimiento,
        );

        if (madresDeOtroEstablecimiento.length > 0) {
          throw new ForbiddenException(
            `Algunas madres no pertenecen a su establecimiento: ${madresDeOtroEstablecimiento.map((m) => m.id_madre).join(', ')}`,
          );
        }
      }

      if (updateEventoDto.fecha_evento)
        evento.fecha_evento = new Date(updateEventoDto.fecha_evento);
      if (updateEventoDto.observacion)
        evento.observacion = updateEventoDto.observacion;
      evento.terneros = ternerosArray;
      evento.madres = madresArray;

      return await this.eventoRepository.save(evento);
    } catch (error) {
      throw new HttpException(
        `Error al actualizar el evento con el ID ${id}: ${error.message}`,
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
      const evento = await this.findOne(id, idEstablecimiento, esAdmin);
      await this.eventoRepository.remove(evento);
      return { message: 'El evento fue eliminado con éxito' };
    } catch (error) {
      throw new HttpException(
        `Error al eliminar el evento con el ID ${id}: ${error.message}`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
