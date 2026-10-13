import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TipoMovimientoStock } from '../entities/movimiento-stock.entity';

export class CreateMovimientoStockDto {
  @IsEnum(TipoMovimientoStock)
  tipo: TipoMovimientoStock;

  @IsNumber()
  @Min(0.001)
  cantidad: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
