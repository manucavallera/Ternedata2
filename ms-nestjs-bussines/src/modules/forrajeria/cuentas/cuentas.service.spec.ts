import { NotFoundException } from '@nestjs/common';
import { CuentasService } from './cuentas.service';

describe('CuentasService', () => {
  const contactoRepository = { findOne: jest.fn() };
  const movimientoRepository = { find: jest.fn() };
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
});
