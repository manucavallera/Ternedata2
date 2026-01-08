import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../entity/users.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@ejemplo.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Rol del usuario',
    enum: UserRole,
    default: UserRole.OPERARIO,
  })
  @IsEnum(UserRole)
  @IsOptional()
  rol?: string;

  @ApiProperty({
    description: 'Estado del usuario',
    enum: UserStatus,
    default: UserStatus.ACTIVO,
  })
  @IsEnum(UserStatus)
  @IsOptional()
  estado?: string;

  @ApiProperty({
    description: 'Teléfono del usuario',
    required: false,
    example: '+54 379 4123456',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({
    description: 'ID del establecimiento asignado',
    required: false,
    example: 1,
  })
  @IsInt()
  @IsOptional()
  id_establecimiento?: number; // ⬅️ NUEVO CAMPO
}

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiProperty({ required: false, enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  rol?: string;

  @ApiProperty({ required: false, enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  estado?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  id_establecimiento?: number; // ⬅️ NUEVO CAMPO
}
