import { ConflictException } from '@nestjs/common';
import { ContactosService } from './contactos.service';
import { TipoContacto } from './entities/contacto.entity';

describe('ContactosService', () => {
  const contactoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  let service: ContactosService;

  beforeEach(() => {
    jest.clearAllMocks();
    contactoRepository.findOne.mockResolvedValue(null);
    service = new ContactosService(contactoRepository as any);
  });

  it('crea el contacto dentro de la organización activa', async () => {
    const contacto = { id_contacto: 2, id_establecimiento: 12 };
    contactoRepository.create.mockImplementation((dto) => dto);
    contactoRepository.save.mockResolvedValue(contacto);

    await expect(
      service.createContacto(12, {
        tipo: TipoContacto.CLIENTE,
        nombre: 'Cliente Norte',
        documento: '20333444',
      }),
    ).resolves.toEqual(contacto);

    expect(contactoRepository.create).toHaveBeenCalledWith({
      tipo: TipoContacto.CLIENTE,
      nombre: 'Cliente Norte',
      documento: '20333444',
      id_establecimiento: 12,
      limite_credito: 0,
    });
  });

  it('rechaza duplicados por organización, tipo y documento', async () => {
    contactoRepository.findOne.mockResolvedValue({ id_contacto: 8 });

    await expect(
      service.createContacto(12, {
        tipo: TipoContacto.CLIENTE,
        nombre: 'Cliente repetido',
        documento: '20333444',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(contactoRepository.create).not.toHaveBeenCalled();
  });

  it('filtra contactos por organización y tipo', async () => {
    contactoRepository.find.mockResolvedValue([]);

    await service.findContactos(12, TipoContacto.PROVEEDOR);

    expect(contactoRepository.find).toHaveBeenCalledWith({
      where: { id_establecimiento: 12, tipo: TipoContacto.PROVEEDOR },
      order: { nombre: 'ASC' },
    });
  });

  it('actualiza solo un contacto perteneciente a la organización activa', async () => {
    const contacto = {
      id_contacto: 4,
      id_establecimiento: 12,
      tipo: TipoContacto.CLIENTE,
      nombre: 'Nombre anterior',
    };
    const actualizado = { ...contacto, nombre: 'Nombre nuevo' };
    contactoRepository.findOne.mockResolvedValue(contacto);
    contactoRepository.save.mockResolvedValue(actualizado);

    await expect(
      service.updateContacto(12, 4, { nombre: 'Nombre nuevo' }),
    ).resolves.toEqual(actualizado);
    expect(contactoRepository.save).toHaveBeenCalledWith(actualizado);
  });
});
