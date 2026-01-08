import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventoDto {
  @ApiProperty({ description: 'Fecha del evento', example: '2024-02-27' })
  @IsNotEmpty()
  @IsDateString()
  fecha_evento: string;

  @ApiProperty({
    description: 'Observación sobre el evento',
    example: 'El ternero fue vacunado contra fiebre aftosa',
  })
  @IsNotEmpty()
  @IsString()
  observacion: string;

  @ApiProperty({
    description: 'IDs de los terneros relacionados con el evento',
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  id_ternero?: number[];

  @ApiProperty({
    description: 'IDs de las madres relacionadas con el evento',
    example: [1],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  id_madre?: number[];

  // ✅ NUEVO: Campo opcional para establecimiento
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
