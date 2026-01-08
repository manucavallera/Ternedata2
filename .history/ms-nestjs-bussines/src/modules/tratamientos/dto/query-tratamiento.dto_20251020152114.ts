import { IsOptional, IsEnum, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TurnoTratamiento {
  MAÑANA = 'mañana',
  TARDE = 'tarde',
}

export class QueryTratamientoDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de enfermedad',
    example: 'diarrea',
  })
  @IsOptional()
  @IsString()
  tipo_enfermedad?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por turno',
    enum: TurnoTratamiento,
    example: 'tarde',
  })
  @IsOptional()
  @IsEnum(TurnoTratamiento)
  turno?: TurnoTratamiento;

  // 🆕 AGREGAR ESTE CAMPO
  @ApiPropertyOptional({
    description: 'Filtrar por ID de establecimiento (solo para admin)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id_establecimiento?: number;
}
