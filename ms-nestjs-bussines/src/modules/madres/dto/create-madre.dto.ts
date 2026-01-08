import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsInt,
} from 'class-validator';

export class CreateMadreDto {
  @ApiProperty({ description: 'Nombre de la madre', example: 'Luna' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'RP de la madre', example: 1023 })
  @IsNotEmpty()
  @IsNumber()
  rp_madre: number;

  @ApiProperty({
    description: 'Estado de la madre',
    example: 'Seca',
    enum: ['Seca', 'En Tambo'],
  })
  @IsNotEmpty()
  @IsEnum(['Seca', 'En Tambo'])
  estado: string;

  @ApiProperty({
    description: 'Observaciones sobre la madre',
    example: 'Madre con buena producción de leche',
  })
  @IsNotEmpty()
  @IsString()
  observaciones: string;

  @ApiProperty({
    description: 'Fecha nacimiento de la madre',
    example: '2024-02-27',
  })
  @IsNotEmpty()
  @IsString()
  fecha_nacimiento: string;

  // ⬅️ NUEVO: ID del establecimiento (opcional porque puede venir del JWT)
  @ApiProperty({
    description: 'ID del establecimiento al que pertenece la madre',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  id_establecimiento?: number;
}
