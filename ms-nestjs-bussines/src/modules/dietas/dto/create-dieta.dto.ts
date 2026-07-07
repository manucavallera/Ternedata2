import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
} from 'class-validator';

export class CreateDietaDto {
  @ApiProperty({ description: 'ID del rodeo', example: 7 })
  @IsNotEmpty()
  @IsInt()
  id_rodeo: number;

  @ApiProperty({ description: 'Modo de la dieta', enum: ['nota', 'formula'] })
  @IsNotEmpty()
  @IsIn(['nota', 'formula'])
  modo: string;

  @ApiProperty({ description: 'Nombre/etiqueta de la dieta', required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ description: 'Nota libre (modo nota)', required: false })
  @IsOptional()
  @IsString()
  nota?: string;

  @ApiProperty({ description: 'Kg por animal (modo formula)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kg_por_animal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  id_establecimiento?: number;
}
