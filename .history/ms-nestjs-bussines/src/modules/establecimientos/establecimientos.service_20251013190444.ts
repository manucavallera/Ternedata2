import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Establecimiento } from './entities/establecimiento.entity';
import {
  CreateEstablecimientoDto,
  UpdateEstablecimientoDto,
} from './dto/establecimiento.dto';

@Injectable()
export class EstablecimientosService {
  constructor(
    @InjectRepository(Establecimiento)
    private readonly establecimientoRepository: Repository<Establecimiento>,
  ) {}

  async create(createDto: CreateEstablecimientoDto): Promise<Establecimiento> {
    const establecimiento = this.establecimientoRepository.create(createDto);
    return await this.establecimientoRepository.save(establecimiento);
  }

  async findAll(): Promise<Establecimiento[]> {
    return await this.establecimientoRepository.find({
      order: { fecha_creacion: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Establecimiento> {
    const establecimiento = await this.establecimientoRepository.findOne({
      where: { id_establecimiento: id },
    });

    if (!establecimiento) {
      throw new NotFoundException(`Establecimiento con ID ${id} no encontrado`);
    }

    return establecimiento;
  }

  async update(
    id: number,
    updateDto: UpdateEstablecimientoDto,
  ): Promise<Establecimiento> {
    await this.findOne(id); // Verifica que existe
    await this.establecimientoRepository.update(id, updateDto);
    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const establecimiento = await this.findOne(id);
    await this.establecimientoRepository.remove(establecimiento);
  }

  async getEstadisticas() {
    const [total, activos, inactivos] = await Promise.all([
      this.establecimientoRepository.count(),
      this.establecimientoRepository.count({ where: { estado: 'activo' } }),
      this.establecimientoRepository.count({ where: { estado: 'inactivo' } }),
    ]);

    return { total, activos, inactivos };
  }
}
