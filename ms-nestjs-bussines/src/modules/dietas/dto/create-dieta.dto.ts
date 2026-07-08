import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class IngredienteDto {
  @ApiProperty({ description: 'Nombre del ingrediente', example: 'Silo de maíz' })
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @ApiProperty({ description: 'Kg totales del ingrediente', example: 400 })
  @IsNumber()
  @Min(0)
  kg: number;
}

export class CreateDietaDto {
  @ApiProperty({ description: 'ID del rodeo', example: 7 })
  @IsNotEmpty()
  @IsInt()
  id_rodeo: number;

  @ApiProperty({
    description: 'Modo de la dieta',
    enum: ['nota', 'formula', 'mezcla'],
  })
  @IsNotEmpty()
  @IsIn(['nota', 'formula', 'mezcla'])
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

  @ApiProperty({
    description: 'Ingredientes (modo mezcla)',
    type: [IngredienteDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngredienteDto)
  ingredientes?: IngredienteDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  id_establecimiento?: number;
}
