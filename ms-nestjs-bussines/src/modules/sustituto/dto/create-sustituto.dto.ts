import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateSustitutoDto {
  @ApiProperty({ description: 'Fecha del cálculo', example: '2026-07-07' })
  @IsNotEmpty()
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'Número de terneros', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  numero_terneros: number;

  @ApiProperty({ description: 'Litros por ternero por día', example: 4 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  litros_por_ternero: number;

  @ApiProperty({ description: 'Litros en la toma de la mañana', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tomas_manana?: number;

  @ApiProperty({ description: 'Litros en la toma de la tarde', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tomas_tarde?: number;

  @ApiProperty({
    description: 'Concentración del preparado en kg/L (12,5% = 0,125)',
    example: 0.125,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  concentracion?: number;

  @ApiProperty({ description: 'Precio del sustituto en u$s/Kg', example: 3.2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_sustituto_usd: number;

  @ApiProperty({ description: 'Precio de la leche en $/L', example: 500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio_leche: number;

  @ApiProperty({ description: 'Cotización del dólar en $', example: 1380 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  cotizacion_dolar: number;

  @ApiProperty({ description: 'Observaciones', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  id_establecimiento?: number;
}
