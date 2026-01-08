import { PartialType } from '@nestjs/mapped-types';
import { CreateMadreDto } from './create-madre.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateMadreDto extends PartialType(CreateMadreDto) {
        
        @ApiProperty({ description: 'Nombre de la madre', example: 'Luna' })
        @IsNotEmpty()
        @IsString()
        nombre: string;
      
        @ApiProperty({ description: 'RP de la madre', example: 1023 })
        @IsNotEmpty()
        @IsNumber()
        rp_madre: number;
      
        @ApiProperty({ description: 'Estado de la madre', example: 'Seca', enum: ['Seca', 'En Tambo'] })
        @IsNotEmpty()
        @IsEnum(["Seca", "En Tambo"])
        estado: string;
      
        @ApiProperty({ description: 'Observaciones sobre la madre', example: 'Madre con buena producción de leche' })
        @IsNotEmpty()
        @IsString()
        observaciones: string;
    
        @ApiProperty({ description: 'Fecha nacimiento de la madre', example: '2024-02-27' })
        @IsNotEmpty()
        @IsString()
        fecha_nacimiento: string;

        @ApiProperty({ description: 'IDs de los padres relacionadas con la madre', example: [1], required: false })
        @IsOptional()
        @IsArray()
        @ArrayMinSize(1)
        @IsInt({ each: true }) //  Asegura que cada elemento sea un número entero
        id_padre?: number[];
}
