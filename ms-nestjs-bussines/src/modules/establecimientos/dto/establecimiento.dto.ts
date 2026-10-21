import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { OrganizacionTipo } from '../organizacion-tipo.enum';
import { RolEstablecimiento } from '../../invitaciones/roles.enum';

export class CreateEstablecimientoDto {
  @ApiProperty({
    description: 'Nombre del establecimiento',
    example: 'Estancia La Pampa',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    description: 'Ubicación',
    example: 'Ruta 12 km 45',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  ubicacion?: string;

  @ApiProperty({
    description: 'Teléfono',
    example: '+54 379 4123456',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @ApiProperty({
    description: 'Responsable',
    example: 'Juan Pérez',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  responsable?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({ description: 'Estado', example: 'activo', required: false })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({
    description: 'Tipo de organización',
    enum: OrganizacionTipo,
    default: OrganizacionTipo.GANADERIA,
    required: false,
  })
  @IsEnum(OrganizacionTipo)
  @IsOptional()
  tipo_organizacion?: OrganizacionTipo;
}

export class UpdateEstablecimientoDto {
  @ApiProperty({ description: 'Nombre del establecimiento', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nombre?: string;

  @ApiProperty({ description: 'Ubicación', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  ubicacion?: string;

  @ApiProperty({ description: 'Teléfono', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  telefono?: string;

  @ApiProperty({ description: 'Responsable', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  responsable?: string;

  @ApiProperty({ description: 'Notas adicionales', required: false })
  @IsString()
  @IsOptional()
  notas?: string;

  @ApiProperty({ description: 'Estado', required: false })
  @IsString()
  @IsOptional()
  estado?: string;

  // 👇 AGREGA ESTO AQUÍ AL FINAL (Permite guardar el JSON)
  @ApiProperty({
    description: 'Configuración de alertas (JSON)',
    required: false,
  })
  @IsOptional()
  configuracion?: any;

  @ApiProperty({ description: 'Tipo de organización', enum: OrganizacionTipo, required: false })
  @IsEnum(OrganizacionTipo)
  @IsOptional()
  tipo_organizacion?: OrganizacionTipo;
}

export class CambiarRolMiembroDto {
  @ApiProperty({ enum: RolEstablecimiento, example: RolEstablecimiento.VETERINARIO })
  @IsEnum(RolEstablecimiento)
  rol: RolEstablecimiento;
}
