import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CuentasService } from './cuentas.service';

describe('CuentasService', () => {
  const contactoRepository = { findOne: jest.fn() };
  const movimientoRepository = { find: jest.fn(), create: jest.fn(), save: jest.fn() };
  const transactionalMovimientoRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn().mockReturnValue(transactionalMovimientoRepository),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  let service: CuentasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CuentasService(
      contactoRepository as any,
      movimientoRepository as any,
      dataSource as any,
    );
  });

  it('devuelve el saldo de cada contacto de la organización', async () => {
    const d = (dia: number) => new Date(`2026-10-${String(dia).padStart(2, "0")}T12:00:00Z`);
    movimientoRepository.find.mockResolvedValue([
      { id_contacto: 3, debe: '1000.10', haber: '0', fecha_creacion: d(10) },
      { id_contacto: 3, debe: '0', haber: '400', fecha_creacion: d(20) },
      { id_contacto: 3, debe: '0', haber: '100', fecha_creacion: d(15) },
      { id_contacto: 4, debe: '0', haber: '50', fecha_creacion: d(5) },
    ]);

    const saldos = await service.getSaldos(12);

    expect(movimientoRepository.find).toHaveBeenCalledWith({ where: { id_establecimiento: 12 } });
    expect(saldos).toEqual([
      { id_contacto: 3, saldo: 500.1, ultimo_pago: d(20), ultima_compra: d(10) },
      { id_contacto: 4, saldo: -50, ultimo_pago: d(5), ultima_compra: null },
    ]);
  });

  it('calcula saldo como debe menos haber dentro de la organización', async () => {
    const contacto = { id_contacto: 3, id_establecimiento: 12 };
    contactoRepository.findOne.mockResolvedValue(contacto);
    movimientoRepository.find.mockResolvedValue([
      { debe: '1000', haber: '0' },
      { debe: '0', haber: '250' },
    ]);

    await expect(service.getCuenta(12, 3)).resolves.toMatchObject({
      contacto,
      saldo: 750,
    });
    expect(movimientoRepository.find).toHaveBeenCalledWith({
      where: { id_establecimiento: 12, id_contacto: 3 },
      order: { fecha_creacion: 'DESC' },
    });
  });

  it('no permite pagar un contacto de otra organización', async () => {
    contactoRepository.findOne.mockResolvedValue(null);

    await expect(
      service.registrarPago(12, 3, { monto: 250 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('registra pagos como haber en una transacción', async () => {
    contactoRepository.findOne.mockResolvedValue({
      id_contacto: 3,
      id_establecimiento: 12,
    });
    const movimiento = { id_movimiento: 6 };
    transactionalMovimientoRepository.create.mockReturnValue(movimiento);
    transactionalMovimientoRepository.save.mockResolvedValue(movimiento);

    await expect(
      service.registrarPago(12, 3, { monto: 250, concepto: 'Seña' }),
    ).resolves.toEqual(movimiento);
    expect(transactionalMovimientoRepository.create).toHaveBeenCalledWith({
      id_establecimiento: 12,
      id_contacto: 3,
      concepto: 'Seña',
      debe: 0,
      haber: 250,
    });
  });

  it('no registra un cobro a un proveedor', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 3, tipo: 'proveedor' });
    await expect(service.registrarPago(12, 3, { monto: 250 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('el pago a un proveedor baja lo que le debemos (debe)', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 3, tipo: 'proveedor' });
    movimientoRepository.create.mockImplementation((value) => value);
    movimientoRepository.save.mockImplementation((value) => value);
    await expect(service.registrarPagoProveedor(12, 3, { monto: 900 })).resolves.toEqual({
      id_establecimiento: 12, id_contacto: 3, concepto: 'Pago a proveedor', debe: 900, haber: 0,
    });
  });

  it('no paga como proveedor a un cliente', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 3, tipo: 'cliente' });
    await expect(service.registrarPagoProveedor(12, 3, { monto: 900 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
