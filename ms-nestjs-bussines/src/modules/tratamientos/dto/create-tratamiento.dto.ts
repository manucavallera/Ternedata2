import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TurnoTratamiento {
  MAÑANA = 'mañana',
  TARDE = 'tarde',
}

export class CreateTratamientoDto {
  @ApiProperty({
    description: 'Nombre del tratamiento',
    example: 'Antibiótico Amoxicilina',
  })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del tratamiento',
    example: 'Tratamiento antibiótico para infecciones bacterianas',
  })
  @IsNotEmpty()
  @IsString()
  descripcion: string;

  @ApiProperty({
    description: 'Tipo de enfermedad a tratar (texto libre)',
    example: 'Diarrea bacteriana',
  })
  @IsNotEmpty()
  @IsString()
  tipo_enfermedad: string;

  @ApiProperty({
    description: 'Turno en que se aplicó el tratamiento',
    enum: TurnoTratamiento,
    example: TurnoTratamiento.MAÑANA,
  })
  @IsNotEmpty()
  @IsEnum(TurnoTratamiento)
  turno: TurnoTratamiento;

  @ApiProperty({
    description: 'Fecha tratamiento',
    example: '2024-12-15',
  })
  @IsNotEmpty()
  @IsString()
  fecha_tratamiento: string;

  @ApiProperty({
    description: 'ID del ternero al que se aplica el tratamiento',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  id_ternero?: number;

  // 🆕 AGREGAR ESTE CAMPO
  @ApiPropertyOptional({
    description:
      'ID del establecimiento (solo para admin, veterinario/operario usa el del JWT)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id_establecimiento?: number;
}

// DTO para crear múltiples tratamientos
export class CreateMultiplesTratamientosDto {
  @ApiProperty({
    description: 'Array de tratamientos a crear',
    type: [CreateTratamientoDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un tratamiento' })
  @ValidateNested({ each: true })
  @Type(() => CreateTratamientoDto)
  tratamientos: CreateTratamientoDto[];

  // 🆕 AGREGAR ESTE CAMPO
  @ApiPropertyOptional({
    description:
      'ID del establecimiento para todos los tratamientos (solo para admin)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  id_establecimiento?: number;
}

export class CreateMultiplesTratamientosResponseDto {
  @ApiProperty({
    description: 'Número total de tratamientos creados',
    example: 3,
  })
  total_creados: number;

  @ApiProperty({
    description: 'Lista de tratamientos creados exitosamente',
    type: [Object],
  })
  tratamientos_creados: any[];

  @ApiProperty({
    description: 'Lista de errores si algún tratamiento falló',
    type: [Object],
    required: false,
  })
  errores?: any[];

  @ApiProperty({
    description: 'Mensaje de resultado',
    example: 'Se crearon 3 tratamientos exitosamente',
  })
  mensaje: string;
}
