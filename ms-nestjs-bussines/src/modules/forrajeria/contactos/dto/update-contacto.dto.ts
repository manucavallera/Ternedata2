import { PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateContactoForrajeriaDto } from './create-contacto.dto';

export class UpdateContactoForrajeriaDto extends PartialType(
  CreateContactoForrajeriaDto,
) {
  // Dar de baja no borra: los pedidos y la cuenta corriente siguen visibles.
  @IsOptional()
  @IsIn(['activo', 'inactivo'])
  estado?: 'activo' | 'inactivo';
}
