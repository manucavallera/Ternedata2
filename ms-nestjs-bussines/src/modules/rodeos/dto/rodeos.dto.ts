import {
  IsString,
  IsOptional,
  IsInt,
  IsIn,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRodeoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  @IsIn(['cria', 'destete', 'engorde', 'reproduccion', 'otro'], {
    message: 'Tipo de rodeo inválido',
  })
  tipo?: string;

  @IsInt({ message: 'El ID de establecimiento debe ser un número entero' })
  @Type(() => Number)
  id_establecimiento: number;

  @IsString()
  @IsOptional()
  @IsIn(['activo', 'inactivo'], { message: 'Estado inválido' })
  estado?: string;
}

export class UpdateRodeoDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  @IsIn(['cria', 'destete', 'engorde', 'reproduccion', 'otro'], {
    message: 'Tipo de rodeo inválido',
  })
  tipo?: string;

  @IsInt({ message: 'El ID de establecimiento debe ser un número entero' })
  @Type(() => Number)
  @IsOptional()
  id_establecimiento?: number;

  @IsString()
  @IsOptional()
  @IsIn(['activo', 'inactivo'], { message: 'Estado inválido' })
  estado?: string;
}
