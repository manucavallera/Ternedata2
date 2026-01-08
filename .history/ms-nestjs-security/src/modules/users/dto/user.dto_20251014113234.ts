// ms-nestjs-security/src/modules/users/dto/user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  Length,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';
import { UserRole, UserStatus } from '../entity/users.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
  })
  @IsString()
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  name: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@gmail.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío' })
  @Length(5, 100, {
    message: 'El correo electrónico debe tener entre 5 y 100 caracteres',
  })
  email: string;

  @ApiProperty({
    description: 'Password del usuario',
    example: '123456789',
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(500, {
    message: 'La contraseña no puede exceder los 500 caracteres',
  })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía' })
  password: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'operario',
    enum: UserRole,
    required: false,
  })
  @IsEnum(UserRole, {
    message: 'Rol inválido. Debe ser: admin, veterinario u operario',
  })
  @IsOptional()
  rol?: UserRole;

  @ApiProperty({
    description: 'Estado del usuario',
    example: 'activo',
    enum: UserStatus,
    required: false,
  })
  @IsEnum(UserStatus, {
    message: 'Estado inválido. Debe ser: activo o inactivo',
  })
  @IsOptional()
  estado?: UserStatus;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+543794123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede exceder los 20 caracteres' })
  telefono?: string;

  // 🆕 NUEVO CAMPO
  @ApiProperty({
    description: 'ID del establecimiento al que pertenece el usuario',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'El ID del establecimiento debe ser un número entero' })
  @Min(1, { message: 'El ID del establecimiento debe ser mayor a 0' })
  @IsOptional()
  id_establecimiento?: number;

  @ApiProperty({
    description: 'Permisos especiales en formato JSON',
    example: '{"puede_eliminar": true, "puede_exportar": false}',
    required: false,
  })
  @IsString()
  @IsOptional()
  permisos_especiales?: string;
}

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsString()
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Email del usuario',
    example: 'juan@gmail.com',
    required: false,
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @Length(5, 100, {
    message: 'El correo electrónico debe tener entre 5 y 100 caracteres',
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Password del usuario (opcional en actualización)',
    example: '123456789',
    required: false,
  })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(500, {
    message: 'La contraseña no puede exceder los 500 caracteres',
  })
  @IsOptional()
  password?: string;

  @ApiProperty({
    description: 'Rol del usuario',
    example: 'veterinario',
    enum: UserRole,
    required: false,
  })
  @IsEnum(UserRole, {
    message: 'Rol inválido. Debe ser: admin, veterinario u operario',
  })
  @IsOptional()
  rol?: UserRole;

  @ApiProperty({
    description: 'Estado del usuario',
    example: 'activo',
    enum: UserStatus,
    required: false,
  })
  @IsEnum(UserStatus, {
    message: 'Estado inválido. Debe ser: activo o inactivo',
  })
  @IsOptional()
  estado?: UserStatus;

  @ApiProperty({
    description: 'Teléfono del usuario',
    example: '+543794123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'El teléfono no puede exceder los 20 caracteres' })
  telefono?: string;

  // 🆕 NUEVO CAMPO
  @ApiProperty({
    description: 'ID del establecimiento al que pertenece el usuario',
    example: 1,
    required: false,
  })
  @IsInt({ message: 'El ID del establecimiento debe ser un número entero' })
  @Min(1, { message: 'El ID del establecimiento debe ser mayor a 0' })
  @IsOptional()
  id_establecimiento?: number;

  @ApiProperty({
    description: 'Permisos especiales en formato JSON',
    example: '{"puede_eliminar": true, "puede_exportar": false}',
    required: false,
  })
  @IsString()
  @IsOptional()
  permisos_especiales?: string;
}
