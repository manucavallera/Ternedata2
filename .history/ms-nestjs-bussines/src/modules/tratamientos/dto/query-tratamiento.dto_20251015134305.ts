// src/modules/tratamientos/dto/query-tratamiento.dto.ts
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
}
