import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class LitrosVacaDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  id_madre: number;

  // Sin mañana ni tarde se borra el control de esa vaca en esa fecha.
  @ApiProperty({ required: false, nullable: true, example: 14.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(80)
  litros_manana?: number | null;

  @ApiProperty({ required: false, nullable: true, example: 12 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(80)
  litros_tarde?: number | null;
}

export class GuardarControlDto {
  @ApiProperty({ example: '2026-11-06' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ type: [LitrosVacaDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => LitrosVacaDto)
  vacas: LitrosVacaDto[];
}
