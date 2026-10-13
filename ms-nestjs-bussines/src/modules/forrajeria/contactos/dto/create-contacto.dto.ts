import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoContacto } from '../entities/contacto.entity';

export class CreateContactoForrajeriaDto {
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @IsOptional()
  @IsBoolean()
  es_productor?: boolean;

  @IsString()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  zona?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  limite_credito?: number;
}
