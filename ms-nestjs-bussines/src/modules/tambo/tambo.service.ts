import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { CreateEventoReproductivoDto } from './dto/create-evento-reproductivo.dto';
import { UpdateConfigTamboDto } from './dto/update-config-tambo.dto';
import { EventoReproductivoEntity } from './entities/evento-reproductivo.entity';
import {
  CONFIG_TAMBO_DEFAULT,
  ConfigTambo,
  TipoEvento,
  aFecha,
  calcularEstadoRepro,
  calcularPendientes,
  calcularResumen,
  categoriaPorEvento,
  diasEnLeche,
  hoyArgentina,
} from './reproduccion.logic';

@Injectable()
export class TamboService {
  constructor(
    @InjectRepository(EventoReproductivoEntity)
    private readonly eventoRepo: Repository<EventoReproductivoEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepo: Repository<MadreEntity>,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepo: Repository<TerneroEntity>,
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepo: Repository<Establecimiento>,
  ) {}

  // ---------- configuración ----------

  async obtenerConfig(idEstablecimiento: number): Promise<ConfigTambo> {
    const campo = await this.establecimientoRepo.findOne({
      where: { id_establecimiento: idEstablecimiento },
    });
    const guardada = (campo?.configuracion as any)?.tambo ?? {};
    return { ...CONFIG_TAMBO_DEFAULT, ...guardada };
  }

  async actualizarConfig(idEstablecimiento: number, dto: UpdateConfigTamboDto) {
    const campo = await this.establecimientoRepo.findOne({
      where: { id_establecimiento: idEstablecimiento },
    });
    if (!campo) throw new NotFoundException('Establecimiento no encontrado');
    const actual = await this.obtenerConfig(idEstablecimiento);
    const tambo = { ...actual, ...dto };
    campo.configuracion = { ...(campo.configuracion ?? {}), tambo } as any;
    await this.establecimientoRepo.save(campo);
    return tambo;
  }

  // ---------- eventos ----------

  private async madreDelCampo(idMadre: number, idEstablecimiento: number) {
    const madre = await this.madreRepo.findOne({
      where: { id_madre: idMadre, id_establecimiento: idEstablecimiento },
    });
    if (!madre)
      throw new NotFoundException('Vaca no encontrada en este establecimiento');
    return madre;
  }

  async crearEvento(
    idEstablecimiento: number,
    dto: CreateEventoReproductivoDto,
    idUsuario?: number,
  ) {
    const madre = await this.madreDelCampo(dto.id_madre, idEstablecimiento);
    const fecha = dto.fecha.slice(0, 10);
    if (fecha > hoyArgentina()) {
      throw new BadRequestException('La fecha del evento no puede ser futura');
    }

    const evento = await this.eventoRepo.save(
      this.eventoRepo.create({
        id_establecimiento: idEstablecimiento,
        id_madre: madre.id_madre,
        tipo: dto.tipo,
        fecha,
        resultado: dto.tipo === 'tacto' ? dto.resultado : null,
        dias_gestacion:
          dto.tipo === 'tacto' && dto.resultado === 'preñada'
            ? (dto.dias_gestacion ?? null)
            : null,
        toro: dto.tipo === 'inseminacion' ? dto.toro?.trim() || null : null,
        observacion: dto.observacion?.trim() || null,
        creado_por: idUsuario ?? null,
      }),
    );

    // La categoría solo cambia si el evento es el más nuevo de la vaca:
    // cargar un parto viejo no tiene que sacar del preparto a una vaca seca.
    const categoria = categoriaPorEvento(dto.tipo as TipoEvento);
    if (categoria) {
      const masNuevo = await this.eventoRepo
        .createQueryBuilder('e')
        .where('e.id_madre = :id', { id: madre.id_madre })
        .andWhere('e.tipo IN (:...tipos)', {
          tipos: ['parto', 'secado', 'preparto'],
        })
        .andWhere('(e.fecha > :f OR (e.fecha = :f AND e.id_evento > :idEv))', {
          f: fecha,
          idEv: evento.id_evento,
        })
        .getCount();
      if (masNuevo === 0) {
        await this.madreRepo.update(
          { id_madre: madre.id_madre },
          { estado: categoria },
        );
      }
    }

    const estado = await this.recalcularMadre(madre.id_madre);
    return { evento, madre: estado };
  }

  async listarEventos(idEstablecimiento: number, idMadre?: number) {
    const q = this.eventoRepo
      .createQueryBuilder('e')
      .leftJoin('e.madre', 'm')
      .addSelect(['m.id_madre', 'm.rp_madre', 'm.nombre'])
      .where('e.id_establecimiento = :id', { id: idEstablecimiento })
      .orderBy('e.fecha', 'DESC')
      .addOrderBy('e.id_evento', 'DESC');
    if (idMadre) q.andWhere('e.id_madre = :idMadre', { idMadre });
    else q.take(200);
    return q.getMany();
  }

  async eliminarEvento(idEstablecimiento: number, idEvento: number) {
    const evento = await this.eventoRepo.findOne({
      where: { id_evento: idEvento, id_establecimiento: idEstablecimiento },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    await this.eventoRepo.remove(evento);
    const madre = await this.recalcularMadre(evento.id_madre);
    return { message: 'Evento eliminado', madre };
  }

  // Rehace el estado reproductivo de la vaca desde sus eventos y sus terneros.
  // Lo usa también TernerosService al cargar un nacimiento.
  async recalcularMadre(idMadre: number) {
    const madre = await this.madreRepo.findOne({
      where: { id_madre: idMadre },
    });
    if (!madre) return null;
    const config = await this.obtenerConfig(madre.id_establecimiento);
    const eventos = await this.eventoRepo.find({
      where: { id_madre: idMadre },
    });
    const ultimo = await this.terneroRepo
      .createQueryBuilder('t')
      .select('MAX(t.fecha_nacimiento)', 'ultimo')
      .where('t.id_madre = :id', { id: idMadre })
      .getRawOne();

    const estado = calcularEstadoRepro(
      eventos.map((e) => ({
        id: e.id_evento,
        tipo: e.tipo as TipoEvento,
        fecha: aFecha(e.fecha),
        resultado: e.resultado,
        dias_gestacion: e.dias_gestacion,
      })),
      config,
      aFecha(ultimo?.ultimo),
    );
    await this.madreRepo.update({ id_madre: idMadre }, estado);
    return { id_madre: idMadre, estado: madre.estado, ...estado };
  }

  // ---------- pendientes y resumen ----------

  private async madresDelCampo(idEstablecimiento: number, idRodeo?: number) {
    const where: any = { id_establecimiento: idEstablecimiento };
    if (idRodeo) where.id_rodeo = idRodeo;
    return this.madreRepo.find({
      where,
      select: [
        'id_madre',
        'rp_madre',
        'nombre',
        'estado',
        'id_rodeo',
        'estado_reproductivo',
        'fecha_ultimo_parto',
        'fecha_ultimo_servicio',
        'fecha_ultimo_parche',
        'fecha_parto_probable',
        'numero_servicios',
      ],
    });
  }

  async pendientes(idEstablecimiento: number, idRodeo?: number) {
    const [madres, config] = await Promise.all([
      this.madresDelCampo(idEstablecimiento, idRodeo),
      this.obtenerConfig(idEstablecimiento),
    ]);
    return {
      config,
      pendientes: calcularPendientes(madres as any, config, hoyArgentina()),
    };
  }

  async resumen(idEstablecimiento: number, idRodeo?: number) {
    const madres = await this.madresDelCampo(idEstablecimiento, idRodeo);
    return calcularResumen(madres as any, hoyArgentina());
  }

  // Listado del rodeo lechero: todas las vacas con lo que hace falta para la tarjeta.
  async rodeo(idEstablecimiento: number, idRodeo?: number) {
    const madres = await this.madreRepo.find({
      where: idRodeo
        ? { id_establecimiento: idEstablecimiento, id_rodeo: idRodeo }
        : { id_establecimiento: idEstablecimiento },
      relations: ['rodeo'],
      order: { rp_madre: 'ASC' },
    });
    const hoy = hoyArgentina();
    return madres.map((m) => ({
      id_madre: m.id_madre,
      rp_madre: m.rp_madre,
      nombre: m.nombre,
      estado: m.estado,
      id_rodeo: m.id_rodeo,
      rodeo: m.rodeo
        ? { id_rodeo: m.rodeo.id_rodeo, nombre: m.rodeo.nombre }
        : null,
      estado_reproductivo: m.estado_reproductivo,
      fecha_ultimo_parto: aFecha(m.fecha_ultimo_parto),
      fecha_ultimo_servicio: aFecha(m.fecha_ultimo_servicio),
      fecha_ultimo_parche: aFecha(m.fecha_ultimo_parche),
      fecha_parto_probable: aFecha(m.fecha_parto_probable),
      numero_servicios: m.numero_servicios,
      dias_en_leche: diasEnLeche(m as any, hoy),
    }));
  }
}
