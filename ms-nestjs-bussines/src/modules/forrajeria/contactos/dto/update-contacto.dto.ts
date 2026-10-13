import { PartialType } from '@nestjs/swagger';
import { CreateContactoForrajeriaDto } from './create-contacto.dto';

export class UpdateContactoForrajeriaDto extends PartialType(
  CreateContactoForrajeriaDto,
) {}
