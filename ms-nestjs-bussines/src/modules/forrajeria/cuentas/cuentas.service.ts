import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePagoForrajeriaDto } from './dto/create-pago.dto';
import { MovimientoCuentaForrajeria } from './entities/movimiento-cuenta.entity';
import { ContactoForrajeria } from '../contactos/entities/contacto.entity';

@Injectable()
export class CuentasService {
  constructor(
    @InjectRepository(ContactoForrajeria)
    private readonly contactoRepository: Repository<ContactoForrajeria>,
    @InjectRepository(MovimientoCuentaForrajeria)
    private readonly movimientoRepository: Repository<MovimientoCuentaForrajeria>,
    private readonly dataSource: DataSource,
  ) {}

  private async findContacto(idEstablecimiento: number, idContacto: number) {
    const contacto = await this.contactoRepository.findOne({
      where: { id_contacto: idContacto, id_establecimiento: idEstablecimiento },
    });
    if (!contacto) {
      throw new NotFoundException('Contacto no encontrado en la organización activa');
    }
    return contacto;
  }

  async getCuenta(idEstablecimiento: number, idContacto: number) {
    const contacto = await this.findContacto(idEstablecimiento, idContacto);
    const movimientos = await this.movimientoRepository.find({
      where: { id_establecimiento: idEstablecimiento, id_contacto: idContacto },
      order: { fecha_creacion: 'DESC' },
    });
    const saldo = movimientos.reduce(
      (total, movimiento) => total + Number(movimiento.debe || 0) - Number(movimiento.haber || 0),
      0,
    );
    return { contacto, movimientos, saldo };
  }

  // Saldo de cada contacto con movimientos (debe - haber). Positivo = el cliente debe.
  async getSaldos(idEstablecimiento: number) {
    const movimientos = await this.movimientoRepository.find({ where: { id_establecimiento: idEstablecimiento } });
    const saldos = new Map<number, number>();
    for (const m of movimientos) {
      saldos.set(m.id_contacto, (saldos.get(m.id_contacto) || 0) + Number(m.debe || 0) - Number(m.haber || 0));
    }
    return [...saldos].map(([id_contacto, saldo]) => ({ id_contacto, saldo: Math.round(saldo * 100) / 100 }));
  }

  async registrarPago(
    idEstablecimiento: number,
    idContacto: number,
    dto: CreatePagoForrajeriaDto,
  ): Promise<MovimientoCuentaForrajeria> {
    await this.findContacto(idEstablecimiento, idContacto);
    return this.dataSource.transaction(async (manager) => {
      const movimientoRepository = manager.getRepository(MovimientoCuentaForrajeria);
      const movimiento = movimientoRepository.create({
        id_establecimiento: idEstablecimiento,
        id_contacto: idContacto,
        concepto: dto.concepto ?? 'Pago recibido',
        debe: 0,
        haber: dto.monto,
      });
      return movimientoRepository.save(movimiento);
    });
  }
}
