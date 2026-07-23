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

export class CreateLitrosDto {
  @ApiProperty({ description: 'Fecha del registro', example: '2026-07-06' })
  @IsNotEmpty()
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'Litros vendidos', example: 1835 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  litros_vendido: number;

  @ApiProperty({ description: 'Litros para terneros', example: 58 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  litros_terneros: number;

  @ApiProperty({ description: 'Observaciones', required: false })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'Vacas ordeñadas ese día (default: conteo del rodeo)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cantidad_vacas?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  id_establecimiento?: number;
}
