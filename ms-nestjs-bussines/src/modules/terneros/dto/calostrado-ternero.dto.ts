import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class CreateCalostradoTerneroDto {
  @IsDateString()
  fecha_hora: string;

  @IsEnum(['mamadera', 'sonda'])
  metodo: string;

  @IsNumber()
  @IsPositive()
  litros: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  grado_brix?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdateCalostradoTerneroDto extends PartialType(CreateCalostradoTerneroDto) {}
