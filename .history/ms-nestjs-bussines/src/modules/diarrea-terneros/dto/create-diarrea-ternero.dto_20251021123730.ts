import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateDiarreaTerneroDto {
  @ApiProperty({
    description: 'Fecha en que ocurrió la diarrea',
    example: '2024-02-27',
  })
  @IsNotEmpty()
  @IsDateString()
  fecha_diarrea_ternero: string;

  @ApiProperty({
    description: 'Severidad de la diarrea',
    example: 'Moderada',
    enum: ['Leve', 'Moderada', 'Severa', 'Crítica'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['Leve', 'Moderada', 'Severa', 'Crítica'], {
    message: 'La severidad debe ser: Leve, Moderada, Severa o Crítica',
  })
  severidad: string;

  @ApiProperty({
    description: 'ID del ternero afectado',
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  id_ternero: number;

  @ApiProperty({
    description: 'Observaciones médicas adicionales sobre el episodio',
    example:
      'Ternero presenta deshidratación leve, se inició tratamiento con suero oral. Apetito reducido.',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  // ✅ AGREGAR ESTE CAMPO AL FINAL:
  @ApiProperty({
    description: 'ID del establecimiento (opcional, para admins)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  id_establecimiento?: number;
}
