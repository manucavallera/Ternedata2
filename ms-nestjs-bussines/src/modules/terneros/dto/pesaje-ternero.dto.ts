import { PartialType } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePesajeTerneroDto {
  @IsDateString()
  fecha: string;

  @IsNumber()
  @IsPositive()
  peso: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class UpdatePesajeTerneroDto extends PartialType(CreatePesajeTerneroDto) {}
