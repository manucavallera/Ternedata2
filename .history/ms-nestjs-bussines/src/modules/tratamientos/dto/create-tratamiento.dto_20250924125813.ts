import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ⬅️ ENUM ELIMINADO: Ya no necesitamos el enum TipoEnfermedad
// export enum TipoEnfermedad {
//   DIARREA = 'diarrea',
//   NEUMONIA = 'neumonia',
//   DESHIDRATACION = 'deshidratacion',
// }

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

  // 🆕 CAMBIADO: Ahora es un campo de texto libre
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
}

// 🆕 DTO para crear múltiples tratamientos
export class CreateMultiplesTratamientosDto {
  @ApiProperty({
    description: 'Array de tratamientos a crear',
    type: [CreateTratamientoDto],
    example: [
      {
        nombre: 'Antibiótico Amoxicilina',
        descripcion: 'Para infecciones bacterianas en diarrea',
        tipo_enfermedad: 'Diarrea bacteriana',
        turno: 'mañana',
        fecha_tratamiento: '2024-12-15',
      },
      {
        nombre: 'Suero Oral Rehidratante',
        descripcion: 'Rehidratación para casos de deshidratación',
        tipo_enfermedad: 'Deshidratación severa',
        turno: 'tarde',
        fecha_tratamiento: '2024-12-15',
      },
      {
        nombre: 'Expectorante Natural',
        descripcion: 'Para aliviar síntomas respiratorios',
        tipo_enfermedad: 'Problemas respiratorios',
        turno: 'mañana',
        fecha_tratamiento: '2024-12-15',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un tratamiento' })
  @ValidateNested({ each: true })
  @Type(() => CreateTratamientoDto)
  tratamientos: CreateTratamientoDto[];
}

// 🆕 DTO para la respuesta de múltiples tratamientos
export class CreateMultiplesTratamientosResponseDto {
  @ApiProperty({
    description: 'Número total de tratamientos creados',
    example: 3,
  })
  total_creados: number;

  @ApiProperty({
    description: 'Lista de tratamientos creados exitosamente',
    type: [Object],
    example: [
      {
        id_tratamiento: 1,
        nombre: 'Antibiótico Amoxicilina',
        tipo_enfermedad: 'Diarrea bacteriana',
        turno: 'mañana',
      },
      {
        id_tratamiento: 2,
        nombre: 'Suero Oral Rehidratante',
        tipo_enfermedad: 'Deshidratación severa',
        turno: 'tarde',
      },
    ],
  })
  tratamientos_creados: any[];

  @ApiProperty({
    description: 'Lista de errores si algún tratamiento falló',
    type: [Object],
    required: false,
    example: [
      {
        tratamiento: 'Tratamiento X',
        error: 'Ya existe un tratamiento con este nombre',
      },
    ],
  })
  errores?: any[];

  @ApiProperty({
    description: 'Mensaje de resultado',
    example: 'Se crearon 3 tratamientos exitosamente',
  })
  mensaje: string;
}
