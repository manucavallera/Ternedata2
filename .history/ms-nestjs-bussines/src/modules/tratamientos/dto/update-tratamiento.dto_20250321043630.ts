import { PartialType } from '@nestjs/mapped-types';
import { CreateTratamientoDto } from './create-tratamiento.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTratamientoDto extends PartialType(CreateTratamientoDto) {
        @ApiProperty({ description: 'Nombre del tratamiento', example: 'Antibiótico X' })
        @IsNotEmpty()
        @IsString()
        nombre: string;
      
        @ApiProperty({ description: 'Descripción del tratamiento', example: 'Tratamiento para infecciones bacterianas' })
        @IsNotEmpty()
        @IsString()
        descripcion: string;
    
        @ApiProperty({ description: 'Fecha tratamiento', example: '2024-02-27' })
        @IsNotEmpty()
        @IsString()
        fecha_tratamiento: string;
}
