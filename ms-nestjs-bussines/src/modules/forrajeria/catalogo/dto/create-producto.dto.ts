import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { UnidadVenta } from '../entities/producto.entity';

export class CreateProductoForrajeriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsNumber()
  id_categoria?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsEnum(UnidadVenta)
  unidad_venta: UnidadVenta;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lote?: string;

  @IsOptional()
  vencimiento?: Date;
}
