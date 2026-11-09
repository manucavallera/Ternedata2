import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RodeoDietaEntity } from './entities/rodeo-dieta.entity';
import { Rodeos } from '../rodeos/entities/rodeos.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { CreateDietaDto } from './dto/create-dieta.dto';
import { UpdateDietaDto } from './dto/update-dieta.dto';

@Injectable()
export class DietasService {
  private readonly logger = new Logger(DietasService.name);

  constructor(
    @InjectRepository(RodeoDietaEntity)
    private readonly dietaRepository: Repository<RodeoDietaEntity>,
    @InjectRepository(TerneroEntity)
    private readonly terneroRepository: Repository<TerneroEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepository: Repository<MadreEntity>,
    @InjectRepository(Rodeos)
    private readonly rodeoRepository: Repository<Rodeos>,
  ) {}

  private async rodeoDelCampo(idRodeo: number, idEstablecimiento: number) {
    const rodeo = await this.rodeoRepository.findOne({
      where: { id_rodeo: idRodeo, id_establecimiento: idEstablecimiento },
    });
    if (!rodeo) {
      throw new HttpException(
        'Rodeo no encontrado en este establecimiento',
        HttpStatus.NOT_FOUND,
      );
    }
    return rodeo;
  }

  private async contarAnimales(idRodeo: number): Promise<number> {
    const [terneros, madres] = await Promise.all([
      this.terneroRepository.count({ where: { id_rodeo: idRodeo } }),
      this.madreRepository.count({ where: { id_rodeo: idRodeo } }),
    ]);
    return terneros + madres;
  }

  private async conCalculo(dieta: RodeoDietaEntity) {
    if (dieta.modo === 'formula' && dieta.kg_por_animal != null) {
      const cantidad = await this.contarAnimales(dieta.id_rodeo);
      const kg = Number(dieta.kg_por_animal) || 0;
      return {
        ...dieta,
        kg_por_animal: kg,
        cantidad_animales: cantidad,
        total_individual: kg,
        total_rodeo: Math.round(kg * cantidad * 100) / 100,
      };
    }

    if (dieta.modo === 'mezcla' && Array.isArray(dieta.ingredientes)) {
      const cantidad = await this.contarAnimales(dieta.id_rodeo);
      const cargas = dieta.cargas > 0 ? dieta.cargas : 1;
      // Tabla del mixero: por cabeza, por carga y el parcial que marca la
      // balanza al terminar de cargar cada ingrediente.
      let parcial = 0;
      const ingredientes = dieta.ingredientes.map((i) => {
        const kg = Number(i.kg) || 0;
        const porCarga = redondear(kg / cargas);
        parcial = redondear(parcial + porCarga);
        return {
          nombre: i.nombre,
          icono: i.icono ?? null,
          kg,
          kg_por_cabeza: cantidad > 0 ? redondear(kg / cantidad) : null,
          kg_por_carga: porCarga,
          parcial_carga: parcial,
        };
      });
      const total = ingredientes.reduce((acc, i) => acc + i.kg, 0);
      const totalRodeo = Math.round(total * 100) / 100;
      return {
        ...dieta,
        cargas,
        kg_por_carga: redondear(total / cargas),
        ingredientes,
        cantidad_animales: cantidad,
        // kg/animal derivado (informativo)
        kg_por_animal:
          cantidad > 0 ? Math.round((total / cantidad) * 100) / 100 : null,
        total_individual: null,
        total_rodeo: totalRodeo,
      };
    }

    return {
      ...dieta,
      cantidad_animales: null,
      total_individual: null,
      total_rodeo: null,
    };
  }

  async crear(dto: CreateDietaDto, idEstablecimiento: number) {
    await this.rodeoDelCampo(dto.id_rodeo, idEstablecimiento);
    try {
      const dieta = this.dietaRepository.create({
        id_rodeo: dto.id_rodeo,
        id_establecimiento: idEstablecimiento,
        modo: dto.modo,
        nombre: dto.nombre,
        nota: dto.modo === 'nota' ? dto.nota : null,
        kg_por_animal: dto.modo === 'formula' ? dto.kg_por_animal : null,
        ingredientes: dto.modo === 'mezcla' ? (dto.ingredientes ?? []) : null,
        cargas: dto.cargas ?? 1,
      });
      const guardada = await this.dietaRepository.save(dieta);
      return this.conCalculo(guardada);
    } catch (error) {
      this.logger.error('Error al crear dieta', error);
      throw new HttpException(
        `Error al crear dieta: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Todas las dietas del campo con el nombre del rodeo (pantalla de mixers).
  async listarDelCampo(idEstablecimiento: number, modo?: string) {
    const where: any = { id_establecimiento: idEstablecimiento };
    if (modo) where.modo = modo;
    const [dietas, rodeos] = await Promise.all([
      this.dietaRepository.find({ where, order: { creado_en: 'DESC' } }),
      this.rodeoRepository.find({
        where: { id_establecimiento: idEstablecimiento },
        select: ['id_rodeo', 'nombre'],
      }),
    ]);
    const nombres = new Map(rodeos.map((r) => [r.id_rodeo, r.nombre]));
    const calculadas = await Promise.all(dietas.map((d) => this.conCalculo(d)));
    return calculadas.map((d) => ({
      ...d,
      rodeo: { id_rodeo: d.id_rodeo, nombre: nombres.get(d.id_rodeo) ?? null },
    }));
  }

  async listarPorRodeo(idRodeo: number, idEstablecimiento: number) {
    try {
      const dietas = await this.dietaRepository.find({
        where: { id_rodeo: idRodeo, id_establecimiento: idEstablecimiento },
        order: { creado_en: 'DESC' },
      });
      return Promise.all(dietas.map((d) => this.conCalculo(d)));
    } catch (error) {
      this.logger.error('Error al listar dietas', error);
      throw new HttpException(
        `Error al listar dietas: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async actualizar(id: number, dto: UpdateDietaDto, idEstablecimiento: number) {
    const dieta = await this.dietaRepository.findOne({
      where: { id_dieta: id, id_establecimiento: idEstablecimiento },
    });
    if (!dieta) {
      throw new HttpException('Dieta no encontrada', HttpStatus.NOT_FOUND);
    }
    if (dto.modo !== undefined) dieta.modo = dto.modo;
    if (dto.nombre !== undefined) dieta.nombre = dto.nombre;
    if (dto.nota !== undefined) dieta.nota = dto.nota;
    if (dto.kg_por_animal !== undefined)
      dieta.kg_por_animal = dto.kg_por_animal;
    if (dto.ingredientes !== undefined) dieta.ingredientes = dto.ingredientes;
    if (dto.cargas !== undefined) dieta.cargas = dto.cargas;
    if (dto.id_rodeo !== undefined && dto.id_rodeo !== dieta.id_rodeo) {
      await this.rodeoDelCampo(dto.id_rodeo, idEstablecimiento);
      dieta.id_rodeo = dto.id_rodeo;
    }
    // coherencia según modo
    if (dieta.modo === 'nota') {
      dieta.kg_por_animal = null;
      dieta.ingredientes = null;
    }
    if (dieta.modo === 'formula') {
      dieta.nota = null;
      dieta.ingredientes = null;
    }
    if (dieta.modo === 'mezcla') {
      dieta.nota = null;
      dieta.kg_por_animal = null;
    }
    const guardada = await this.dietaRepository.save(dieta);
    return this.conCalculo(guardada);
  }

  async eliminar(id: number, idEstablecimiento: number) {
    const dieta = await this.dietaRepository.findOne({
      where: { id_dieta: id, id_establecimiento: idEstablecimiento },
    });
    if (!dieta) {
      throw new HttpException('Dieta no encontrada', HttpStatus.NOT_FOUND);
    }
    await this.dietaRepository.remove(dieta);
    return { message: 'Dieta eliminada', id_dieta: id };
  }
}

function redondear(n: number) {
  return Math.round(n * 100) / 100;
}
