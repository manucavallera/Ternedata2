import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({
      description: 'El email del usuario',
      minLength: 5,
      maxLength: 100,
      example: 'juan@gmail.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío' })
  @Length(5, 100, { message: 'El correo electrónico debe tener entre 5 y 100 caracteres' })
  email: string;

  @ApiProperty({
    description: 'La contraseña del usuario',
    minLength: 6,
    maxLength: 300,
    example: '123456789',
  })
  @IsString()
  @MaxLength(300, { message: 'La contraseña no puede exceder los 300 caracteres' })
  password: string;
}