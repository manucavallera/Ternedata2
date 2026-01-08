import { PartialType } from '@nestjs/mapped-types';
import { CreateEventoDto } from './create-evento.dto';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsDate, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEventoDto extends PartialType(CreateEventoDto) {
    
    @ApiProperty({ description: 'Fecha del evento', example: '2024-02-27' })
    @IsNotEmpty()
    @IsDateString() // Cambiado de @IsDate() a @IsDateString()
    fecha_evento: string;
  
    @ApiProperty({ description: 'Observación sobre el evento', example: 'El ternero fue vacunado contra fiebre aftosa' })
    @IsNotEmpty()
    @IsString()
    observacion: string;

    @ApiProperty({ description: 'IDs de los terneros relacionados con el evento', example: [1, 2], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true }) //  Asegura que cada elemento sea un número entero
    id_ternero?: number[]; 

    @ApiProperty({ description: 'IDs de las madres relacionadas con el evento', example: [1], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true }) //  Asegura que cada elemento sea un número entero
    id_madre?: number[];  
}
