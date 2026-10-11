import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePagoForrajeriaDto {
  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  concepto?: string;
}
