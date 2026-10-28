import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FormaPagoCompra } from '../entities/compra.entity';

export class CreateCompraItemDto {
  @IsInt()
  id_producto: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsNumber()
  @Min(0)
  costo_unitario: number;
}

export class CreateCompraDto {
  @IsInt()
  id_proveedor: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCompraItemDto)
  items: CreateCompraItemDto[];

  @IsOptional()
  @IsEnum(FormaPagoCompra)
  forma_pago?: FormaPagoCompra;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  comprobante?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  // Por defecto el costo del producto pasa a ser el de esta compra.
  @IsOptional()
  @IsBoolean()
  actualizar_costo?: boolean;
}
