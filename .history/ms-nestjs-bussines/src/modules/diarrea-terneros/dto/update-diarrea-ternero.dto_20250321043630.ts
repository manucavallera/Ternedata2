import { PartialType } from '@nestjs/mapped-types';
import { CreateDiarreaTerneroDto } from './create-diarrea-ternero.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateDiarreaTerneroDto extends PartialType(CreateDiarreaTerneroDto) {

      @ApiProperty({ description: 'Fecha en que ocurrió la diarrea', example: '2024-02-27' })
      @IsNotEmpty()
      @IsDate()
      fecha_diarrea_ternero: Date;
    
      @ApiProperty({ description: 'Severidad de la diarrea', example: 'Moderada' })
      @IsNotEmpty()
      @IsString()
      severidad: string;
    
      @ApiProperty({ description: 'ID del ternero afectado', example: 5 })
      @IsNotEmpty()
      @IsNumber()
      id_ternero: number;
      
}
