import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactoForrajeriaDto } from './dto/create-contacto.dto';
import { UpdateContactoForrajeriaDto } from './dto/update-contacto.dto';
import { ContactoForrajeria, TipoContacto } from './entities/contacto.entity';

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(ContactoForrajeria)
    private readonly contactoRepository: Repository<ContactoForrajeria>,
  ) {}

  async createContacto(
    idEstablecimiento: number,
    dto: CreateContactoForrajeriaDto,
  ): Promise<ContactoForrajeria> {
    if (dto.documento) {
      const existente = await this.contactoRepository.findOne({
        where: {
          id_establecimiento: idEstablecimiento,
          tipo: dto.tipo,
          documento: dto.documento,
        },
      });
      if (existente) {
        throw new ConflictException('Ya existe un contacto con ese documento');
      }
    }

    const contacto = this.contactoRepository.create({
      ...dto,
      id_establecimiento: idEstablecimiento,
      limite_credito: dto.limite_credito ?? 0,
    });
    return this.contactoRepository.save(contacto);
  }

  findContactos(
    idEstablecimiento: number,
    tipo?: TipoContacto,
  ): Promise<ContactoForrajeria[]> {
    return this.contactoRepository.find({
      where: tipo
        ? { id_establecimiento: idEstablecimiento, tipo }
        : { id_establecimiento: idEstablecimiento },
      order: { nombre: 'ASC' },
    });
  }

  async updateContacto(
    idEstablecimiento: number,
    idContacto: number,
    dto: UpdateContactoForrajeriaDto,
  ): Promise<ContactoForrajeria> {
    const contacto = await this.contactoRepository.findOne({
      where: { id_contacto: idContacto, id_establecimiento: idEstablecimiento },
    });
    if (!contacto) {
      throw new NotFoundException('Contacto no encontrado en la organización activa');
    }

    if (dto.documento && (dto.documento !== contacto.documento || dto.tipo !== contacto.tipo)) {
      const existente = await this.contactoRepository.findOne({
        where: {
          id_establecimiento: idEstablecimiento,
          tipo: dto.tipo ?? contacto.tipo,
          documento: dto.documento,
        },
      });
      if (existente && existente.id_contacto !== idContacto) {
        throw new ConflictException('Ya existe un contacto con ese documento');
      }
    }

    Object.assign(contacto, dto);
    return this.contactoRepository.save(contacto);
  }
}
