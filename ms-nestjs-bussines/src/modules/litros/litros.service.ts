import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroLitrosEntity } from './entities/registro-litros.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { CreateLitrosDto } from './dto/create-litros.dto';
import { UpdateLitrosDto } from './dto/update-litros.dto';

function conTotal(registro: RegistroLitrosEntity) {
  const vendido = Number(registro.litros_vendido) || 0;
  const terneros = Number(registro.litros_terneros) || 0;
  return {
    ...registro,
    litros_vendido: vendido,
    litros_terneros: terneros,
    total: vendido + terneros,
  };
}

@Injectable()
export class LitrosService {
  private readonly logger = new Logger(LitrosService.name);

  constructor(
    @InjectRepository(RegistroLitrosEntity)
    private readonly litrosRepository: Repository<RegistroLitrosEntity>,
    @InjectRepository(MadreEntity)
    private readonly madreRepository: Repository<MadreEntity>,
  ) {}

  private async contarVacasEnTambo(
    idEstablecimiento: number,
  ): Promise<number> {
    return this.madreRepository.count({
      where: { id_establecimiento: idEstablecimiento, estado: 'En Tambo' },
    });
  }

  async registrar(dto: CreateLitrosDto, idEstablecimiento: number) {
    try {
      // Si el front no manda cantidad_vacas, tomamos el conteo del rodeo como
      // snapshot del día. Queda editable después con +/-.
      const cantidadVacas =
        dto.cantidad_vacas != null
          ? dto.cantidad_vacas
          : await this.contarVacasEnTambo(idEstablecimiento);
      const registro = this.litrosRepository.create({
        fecha: new Date(dto.fecha),
        litros_vendido: dto.litros_vendido,
        litros_terneros: dto.litros_terneros,
        observaciones: dto.observaciones,
        cantidad_vacas: cantidadVacas,
        id_establecimiento: idEstablecimiento,
      });
      const guardado = await this.litrosRepository.save(registro);
      return conTotal(guardado);
    } catch (error) {
      this.logger.error('Error al registrar litros', error);
      throw new HttpException(
        `Error al registrar litros: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(idEstablecimiento: number) {
    try {
      const registros = await this.litrosRepository.find({
        where: { id_establecimiento: idEstablecimiento },
        order: { fecha: 'DESC', creado_en: 'DESC' },
      });
      return registros.map(conTotal);
    } catch (error) {
      this.logger.error('Error al listar litros', error);
      throw new HttpException(
        `Error al listar litros: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getStats(idEstablecimiento: number) {
    try {
      const ultimo = await this.litrosRepository.findOne({
        where: { id_establecimiento: idEstablecimiento },
        order: { fecha: 'DESC', creado_en: 'DESC' },
      });

      const cantidadRodeo = await this.contarVacasEnTambo(idEstablecimiento);

      if (!ultimo) {
        return {
          fecha: null,
          litros_vendido: 0,
          litros_terneros: 0,
          total: 0,
          cantidad_vacas: cantidadRodeo,
          promedio: null,
        };
      }

      // El promedio del día usa las vacas ordeñadas de ESE registro. Si es un
      // registro viejo sin snapshot, caemos al conteo actual del rodeo.
      const conjunto = conTotal(ultimo);
      const cantidadVacas = ultimo.cantidad_vacas ?? cantidadRodeo;
      const promedio =
        cantidadVacas > 0
          ? Math.round((conjunto.total / cantidadVacas) * 100) / 100
          : null;

      return {
        fecha: conjunto.fecha,
        id_registro: ultimo.id_registro,
        litros_vendido: conjunto.litros_vendido,
        litros_terneros: conjunto.litros_terneros,
        total: conjunto.total,
        cantidad_vacas: cantidadVacas,
        promedio,
      };
    } catch (error) {
      this.logger.error('Error al obtener stats de litros', error);
      throw new HttpException(
        `Error al obtener stats de litros: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: number,
    dto: UpdateLitrosDto,
    idEstablecimiento: number,
  ) {
    const registro = await this.litrosRepository.findOne({
      where: { id_registro: id, id_establecimiento: idEstablecimiento },
    });
    if (!registro) {
      throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    }
    if (dto.fecha !== undefined) registro.fecha = new Date(dto.fecha);
    if (dto.litros_vendido !== undefined)
      registro.litros_vendido = dto.litros_vendido;
    if (dto.litros_terneros !== undefined)
      registro.litros_terneros = dto.litros_terneros;
    if (dto.observaciones !== undefined)
      registro.observaciones = dto.observaciones;
    if (dto.cantidad_vacas !== undefined)
      registro.cantidad_vacas = dto.cantidad_vacas;
    const guardado = await this.litrosRepository.save(registro);
    return conTotal(guardado);
  }

  async remove(id: number, idEstablecimiento: number) {
    const registro = await this.litrosRepository.findOne({
      where: { id_registro: id, id_establecimiento: idEstablecimiento },
    });
    if (!registro) {
      throw new HttpException('Registro no encontrado', HttpStatus.NOT_FOUND);
    }
    await this.litrosRepository.remove(registro);
    return { message: 'Registro eliminado', id_registro: id };
  }
}
