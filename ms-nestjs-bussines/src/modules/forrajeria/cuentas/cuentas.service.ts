import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePagoForrajeriaDto } from './dto/create-pago.dto';
import { MovimientoCuentaForrajeria } from './entities/movimiento-cuenta.entity';
import { ContactoForrajeria, TipoContacto } from '../contactos/entities/contacto.entity';

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

  // Saldo de cada contacto con movimientos (debe - haber; positivo = el cliente debe),
  // con la fecha de su último pago y de su última compra a crédito (para ver deudores viejos).
  async getSaldos(idEstablecimiento: number) {
    const movimientos = await this.movimientoRepository.find({ where: { id_establecimiento: idEstablecimiento } });
    const porContacto = new Map<number, { saldo: number; ultimo_pago: Date | null; ultima_compra: Date | null }>();
    const masNueva = (a: Date | null, b: Date) => (!a || new Date(b) > new Date(a) ? b : a);
    for (const m of movimientos) {
      const c = porContacto.get(m.id_contacto) || { saldo: 0, ultimo_pago: null, ultima_compra: null };
      c.saldo += Number(m.debe || 0) - Number(m.haber || 0);
      if (Number(m.haber) > 0) c.ultimo_pago = masNueva(c.ultimo_pago, m.fecha_creacion);
      if (Number(m.debe) > 0) c.ultima_compra = masNueva(c.ultima_compra, m.fecha_creacion);
      porContacto.set(m.id_contacto, c);
    }
    return [...porContacto].map(([id_contacto, c]) => ({
      id_contacto,
      saldo: Math.round(c.saldo * 100) / 100,
      ultimo_pago: c.ultimo_pago,
      ultima_compra: c.ultima_compra,
    }));
  }

  async registrarPago(
    idEstablecimiento: number,
    idContacto: number,
    dto: CreatePagoForrajeriaDto,
  ): Promise<MovimientoCuentaForrajeria> {
    const contacto = await this.findContacto(idEstablecimiento, idContacto);
    // A un proveedor se le paga (baja lo que le debemos): tiene su propio endpoint.
    if (contacto.tipo === TipoContacto.PROVEEDOR) {
      throw new BadRequestException('Es un proveedor: registrá el pago en su ficha de proveedor');
    }
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

  // Pago a un proveedor: baja lo que le debemos (debe; el saldo de un proveedor es negativo cuando le debemos).
  async registrarPagoProveedor(
    idEstablecimiento: number,
    idContacto: number,
    dto: CreatePagoForrajeriaDto,
  ): Promise<MovimientoCuentaForrajeria> {
    const contacto = await this.findContacto(idEstablecimiento, idContacto);
    if (contacto.tipo !== TipoContacto.PROVEEDOR) {
      throw new BadRequestException('El contacto no es un proveedor');
    }
    const movimiento = this.movimientoRepository.create({
      id_establecimiento: idEstablecimiento,
      id_contacto: idContacto,
      concepto: dto.concepto ?? 'Pago a proveedor',
      debe: dto.monto,
      haber: 0,
    });
    return this.movimientoRepository.save(movimiento);
  }
}
