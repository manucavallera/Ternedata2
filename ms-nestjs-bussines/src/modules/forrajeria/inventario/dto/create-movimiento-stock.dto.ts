import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoMovimientoStock } from '../entities/movimiento-stock.entity';

export class CreateMovimientoStockDto {
  @IsEnum(TipoMovimientoStock)
  tipo: TipoMovimientoStock;

  // En un ajuste es el stock contado (puede ser 0). En entrada y salida, mayor a 0 (lo valida el servicio).
  @IsNumber()
  @Min(0)
  cantidad: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivo?: string;
}
