import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsString()
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'juan@gmail.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío' })
  @Length(5, 100, { message: 'El correo electrónico debe tener entre 5 y 100 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Password del usuario',
    example: '123465789',
  })
  @IsString()
  @MaxLength(500, { message: 'La contraseña no puede exceder los 500 caracteres' })
  password: string;
}
