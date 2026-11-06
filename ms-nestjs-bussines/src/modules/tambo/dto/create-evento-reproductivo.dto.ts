import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { RESULTADOS_TACTO, TIPOS_EVENTO } from '../reproduccion.logic';

export class CreateEventoReproductivoDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  id_madre: number;

  @ApiProperty({ enum: TIPOS_EVENTO })
  @IsIn(TIPOS_EVENTO as unknown as string[])
  tipo: string;

  @ApiProperty({ example: '2026-11-06' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ enum: RESULTADOS_TACTO, required: false })
  @ValidateIf((o) => o.tipo === 'tacto')
  @IsIn(RESULTADOS_TACTO as unknown as string[], {
    message: 'El tacto necesita resultado: preñada o vacia',
  })
  resultado?: string;

  @ApiProperty({
    required: false,
    description: 'Días de gestación que dio la ecografía',
  })
  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(290)
  dias_gestacion?: number;

  @ApiProperty({ required: false, description: 'Toro o pajuela' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  toro?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
