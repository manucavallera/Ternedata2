import { PartialType } from '@nestjs/mapped-types';
import { CreateTerneroDto } from './create-ternero.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateTerneroDto extends PartialType(CreateTerneroDto) {
        @ApiProperty({ description: 'Número de RP del ternero', example: 101 })
        @IsNotEmpty()
        @IsNumber()
        rp_ternero: number;
      
        @ApiProperty({ description: 'Sexo del ternero', example: 'Macho', enum: ['Macho', 'Hembra'] })
        @IsNotEmpty()
        @IsEnum(['Macho', 'Hembra'])
        sexo: string;
      
        @ApiProperty({ description: 'Estado del ternero', example: 'Vivo', enum: ['Vivo', 'Muerto'] })
        @IsNotEmpty()
        @IsEnum(['Vivo', 'Muerto'])
        estado: string;
      
        @ApiProperty({ description: 'Peso al nacer en kg', example: 35.2 })
        @IsNotEmpty()
        @IsNumber()
        peso_nacer: number;
      
        @ApiProperty({ description: 'Peso a los 15 días en kg', example: 42.5 })
        @IsNotEmpty()
        @IsNumber()
        peso_15d: number;
      
        @ApiProperty({ description: 'Peso a los 30 días en kg', example: 51.3 })
        @IsNotEmpty()
        @IsNumber()
        peso_30d: number;
      
        @ApiProperty({ description: 'Peso a los 45 días en kg', example: 60.1 })
        @IsNotEmpty()
        @IsNumber()
        peso_45d: number;
      
        @ApiProperty({ description: 'Peso al ser largado en kg', example: 80.0 })
        @IsNotEmpty()
        @IsNumber()
        peso_largado: number;
      
        @ApiProperty({ description: 'Peso estimativo en kg', example: 85.6 })
        @IsNotEmpty()
        @IsNumber()
        estimativo: number;
      
        @ApiProperty({ description: 'Observaciones sobre el ternero', example: 'Buen desarrollo y crecimiento' })
        @IsNotEmpty()
        @IsString()
        observaciones: string;
    
        @ApiProperty({ description: 'Fecha nacimiento del ternero', example: '2024-02-27' })
        @IsNotEmpty()
        @IsString()
        fecha_nacimiento: string;
        
        @ApiProperty({ description: 'ID de la madre a la que pertenece el ternero', example: 1 })
        @IsNotEmpty()
        @IsInt()
        id_madre: number; 
        
        @ApiProperty({ description: 'ID del Padre a la que pertenece el ternero', example: 1 })
        @IsNotEmpty()
        @IsInt()
        id_padre: number;
}
