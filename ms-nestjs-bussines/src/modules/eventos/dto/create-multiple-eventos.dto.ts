import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// DTO para un evento individual CON sus propios terneros y madres
export class EventoCompletoDto {
  @ApiProperty({ description: 'Fecha del evento', example: '2024-02-27' })
  @IsNotEmpty()
  @IsDateString()
  fecha_evento: string;

  @ApiProperty({
    description: 'Observación sobre el evento',
    example: 'Vacunación contra fiebre aftosa',
  })
  @IsNotEmpty()
  @IsString()
  observacion: string;

  @ApiProperty({
    description: 'IDs de los terneros específicos para este evento',
    example: [1, 2, 3],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un ternero' })
  @IsInt({ each: true })
  id_ternero?: number[];

  @ApiProperty({
    description: 'IDs de las madres específicas para este evento',
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos una madre' })
  @IsInt({ each: true })
  id_madre?: number[];
}

// DTO para crear múltiples eventos (cada uno con sus propios animales)
export class CreateMultipleEventosDto {
  @ApiProperty({
    description:
      'Array de eventos a crear, cada uno con sus propios terneros y madres',
    example: [
      {
        fecha_evento: '2024-06-01',
        observacion: 'Vacunación grupo A',
        id_ternero: [1, 2, 3],
        id_madre: [1, 2],
      },
      {
        fecha_evento: '2024-06-05',
        observacion: 'Control veterinario grupo B',
        id_ternero: [4, 5, 6],
        id_madre: [3, 4],
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos un evento' })
  @ValidateNested({ each: true })
  @Type(() => EventoCompletoDto)
  eventos: EventoCompletoDto[];

  // ✅ CAMPO AGREGADO EN LA CLASE CORRECTA
  @ApiProperty({
    description:
      'ID del establecimiento (opcional, se usa el del JWT si no se especifica)',
    example: 1,
    required: false,
  })
  @IsInt()
  @IsOptional()
  id_establecimiento?: number;
}

// MANTENER EL DTO ORIGINAL para eventos individuales
export class EventoDataDto {
  @ApiProperty({ description: 'Fecha del evento', example: '2024-02-27' })
  @IsNotEmpty()
  @IsDateString()
  fecha_evento: string;

  @ApiProperty({
    description: 'Observación sobre el evento',
    example: 'Vacunación contra fiebre aftosa',
  })
  @IsNotEmpty()
  @IsString()
  observacion: string;
}
