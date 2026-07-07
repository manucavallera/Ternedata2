import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CalculoSustitutoEntity } from './entities/calculo-sustituto.entity';
import { CreateSustitutoDto } from './dto/create-sustituto.dto';
import { UpdateSustitutoDto } from './dto/update-sustituto.dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Adjunta los cálculos derivados a partir de los inputs guardados.
function conCalculos(r: CalculoSustitutoEntity) {
  const numeroTerneros = Number(r.numero_terneros) || 0;
  const litrosPorTernero = Number(r.litros_por_ternero) || 0;
  const concentracion = Number(r.concentracion) || 0;
  const precioSustitutoUsd = Number(r.precio_sustituto_usd) || 0;
  const precioLeche = Number(r.precio_leche) || 0;
  const cotizacionDolar = Number(r.cotizacion_dolar) || 0;

  const litros_totales = round2(numeroTerneros * litrosPorTernero);
  const kg_sustituto = round2(litros_totales * concentracion);
  const costo_sustituto_dia = round2(
    kg_sustituto * precioSustitutoUsd * cotizacionDolar,
  );
  const costo_leche_dia = round2(litros_totales * precioLeche);
  // Positivo = el sustituto es más barato que la leche real (cuánto se ahorra por día).
  const ahorro_sustituto = round2(costo_leche_dia - costo_sustituto_dia);
  const conviene =
    costo_sustituto_dia < costo_leche_dia ? 'sustituto' : 'leche';

  return {
    ...r,
    numero_terneros: numeroTerneros,
    litros_por_ternero: litrosPorTernero,
    tomas_manana: Number(r.tomas_manana) || 0,
    tomas_tarde: Number(r.tomas_tarde) || 0,
    concentracion,
    precio_sustituto_usd: precioSustitutoUsd,
    precio_leche: precioLeche,
    cotizacion_dolar: cotizacionDolar,
    // derivados
    litros_totales,
    kg_sustituto,
    costo_sustituto_dia,
    costo_leche_dia,
    ahorro_sustituto,
    conviene,
  };
}

@Injectable()
export class SustitutoService {
  private readonly logger = new Logger(SustitutoService.name);

  constructor(
    @InjectRepository(CalculoSustitutoEntity)
    private readonly sustitutoRepository: Repository<CalculoSustitutoEntity>,
  ) {}

  async registrar(dto: CreateSustitutoDto, idEstablecimiento: number) {
    try {
      const registro = this.sustitutoRepository.create({
        fecha: new Date(dto.fecha),
        numero_terneros: dto.numero_terneros,
        litros_por_ternero: dto.litros_por_ternero,
        tomas_manana: dto.tomas_manana ?? 0,
        tomas_tarde: dto.tomas_tarde ?? 0,
        concentracion: dto.concentracion ?? 0.125,
        precio_sustituto_usd: dto.precio_sustituto_usd,
        precio_leche: dto.precio_leche,
        cotizacion_dolar: dto.cotizacion_dolar,
        observaciones: dto.observaciones,
        id_establecimiento: idEstablecimiento,
      });
      const guardado = await this.sustitutoRepository.save(registro);
      return conCalculos(guardado);
    } catch (error) {
      this.logger.error('Error al registrar cálculo de sustituto', error);
      throw new HttpException(
        `Error al registrar cálculo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(idEstablecimiento: number) {
    try {
      const registros = await this.sustitutoRepository.find({
        where: { id_establecimiento: idEstablecimiento },
        order: { fecha: 'DESC', creado_en: 'DESC' },
      });
      return registros.map(conCalculos);
    } catch (error) {
      this.logger.error('Error al listar cálculos de sustituto', error);
      throw new HttpException(
        `Error al listar cálculos: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUltimo(idEstablecimiento: number) {
    const ultimo = await this.sustitutoRepository.findOne({
      where: { id_establecimiento: idEstablecimiento },
      order: { fecha: 'DESC', creado_en: 'DESC' },
    });
    return ultimo ? conCalculos(ultimo) : null;
  }

  async update(
    id: number,
    dto: UpdateSustitutoDto,
    idEstablecimiento: number,
  ) {
    const registro = await this.sustitutoRepository.findOne({
      where: { id_calculo: id, id_establecimiento: idEstablecimiento },
    });
    if (!registro) {
      throw new HttpException('Cálculo no encontrado', HttpStatus.NOT_FOUND);
    }
    if (dto.fecha !== undefined) registro.fecha = new Date(dto.fecha);
    if (dto.numero_terneros !== undefined)
      registro.numero_terneros = dto.numero_terneros;
    if (dto.litros_por_ternero !== undefined)
      registro.litros_por_ternero = dto.litros_por_ternero;
    if (dto.tomas_manana !== undefined)
      registro.tomas_manana = dto.tomas_manana;
    if (dto.tomas_tarde !== undefined) registro.tomas_tarde = dto.tomas_tarde;
    if (dto.concentracion !== undefined)
      registro.concentracion = dto.concentracion;
    if (dto.precio_sustituto_usd !== undefined)
      registro.precio_sustituto_usd = dto.precio_sustituto_usd;
    if (dto.precio_leche !== undefined)
      registro.precio_leche = dto.precio_leche;
    if (dto.cotizacion_dolar !== undefined)
      registro.cotizacion_dolar = dto.cotizacion_dolar;
    if (dto.observaciones !== undefined)
      registro.observaciones = dto.observaciones;
    const guardado = await this.sustitutoRepository.save(registro);
    return conCalculos(guardado);
  }

  async remove(id: number, idEstablecimiento: number) {
    const registro = await this.sustitutoRepository.findOne({
      where: { id_calculo: id, id_establecimiento: idEstablecimiento },
    });
    if (!registro) {
      throw new HttpException('Cálculo no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.sustitutoRepository.remove(registro);
    return { message: 'Cálculo eliminado', id_calculo: id };
  }
}
