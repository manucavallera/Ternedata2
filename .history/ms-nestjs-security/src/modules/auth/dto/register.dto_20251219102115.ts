import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class RegisterAuthDto {

  @ApiProperty({
    description: 'El nombre del usuario',
    minLength: 3,
    maxLength: 100,
    example: 'Juan Perez',
  })
  @IsString()
  @Length(3, 100, { message: 'El nombre debe tener entre 3 y 100 caracteres' })
  name: string;

  @ApiProperty({
    description: 'El correo electrónico del usuario',
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
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message: 'La contraseña debe tener al menos 6 caracteres y contener letras y números',
  })
  password: string;
  
}
