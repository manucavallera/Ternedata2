import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoriaForrajeriaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;
}
