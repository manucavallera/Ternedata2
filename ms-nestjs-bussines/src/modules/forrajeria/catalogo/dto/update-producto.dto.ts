import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateProductoForrajeriaDto } from './create-producto.dto';

// El stock no se edita acá: solo con movimientos, para que quede registrado.
export class UpdateProductoForrajeriaDto extends PartialType(CreateProductoForrajeriaDto) {
  @IsOptional()
  @IsIn(['activo', 'inactivo'])
  estado?: 'activo' | 'inactivo';
}
