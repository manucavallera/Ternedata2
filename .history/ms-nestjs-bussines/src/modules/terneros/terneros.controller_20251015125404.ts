// ms-nestjs-business/src/modules/terneros/terneros.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TernerosService } from './terneros.service';
import {
  CreateTerneroDto,
  AddPesoDiarioDto,
  HistorialPesosResponseDto,
} from './dto/create-ternero.dto';
import { UpdateTerneroDto } from './dto/update-ternero.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { Roles } from '../auth/roles.decorator';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// DTO para agregar pesaje diario (método legacy)
class AgregarPesajeDto {
  fecha: string;
  peso: number;
  observaciones?: string;
}

// DTO específico para actualizar datos de calostrado
export class UpdateCalostradoDto {
  @ApiProperty({
    description: 'Método de administración del calostrado',
    enum: ['sonda', 'mamadera'],
    example: 'mamadera',
    required: false,
  })
  @IsOptional()
  @IsEnum(['sonda', 'mamadera'])
  metodo_calostrado?: string;

  @ApiProperty({
    description: 'Litros de calostrado administrados',
    example: 2.5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  litros_calostrado?: number;

  @ApiProperty({
    description: 'Fecha y hora de administración del calostrado',
    example: '2024-12-15T08:30:00',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fecha_hora_calostrado?: string;

  @ApiProperty({
    description: 'Observaciones sobre la administración del calostrado',
    example: 'Se administró sin problemas',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones_calostrado?: string;

  @ApiProperty({
    description: 'Grado Brix del calostrado',
    example: 22.5,
    minimum: 0,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'El grado Brix debe ser mayor o igual a 0' })
  @Max(50, { message: 'El grado Brix debe ser menor o igual a 50' })
  grado_brix?: number;
}

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ⭐ GUARDS EN ORDEN
@ApiTags('Terneros')
@Controller('terneros')
export class TernerosController {
  constructor(private readonly ternerosService: TernerosService) {}

  // ============================================================
  // CREAR TERNERO (solo admin y veterinario)
  // ============================================================
  @Post('crear-ternero')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario'
  @ApiOperation({ summary: 'Servicio para crear un ternero' })
  @ApiBody({ type: CreateTerneroDto })
  async create(@Body() createTerneroDto: CreateTerneroDto, @Req() req: any) {
    return this.ternerosService.create({
      ...createTerneroDto,
      id_establecimiento: req.id_establecimiento,
    });
  }

  // ============================================================
  // LISTAR TERNEROS DEL ESTABLECIMIENTO
  // ============================================================
  @Get('/obtener-listado-terneros')
  @ApiOperation({
    summary: 'Trae listado de todos los terneros del establecimiento',
  })
  async findAll(@Req() req: any) {
    return this.ternerosService.findAll(req.id_establecimiento, req.es_admin);
  }

  // ============================================================
  // VER UN TERNERO
  // ============================================================
  @Get('/get-ternero-by-id/:id_ternero')
  @ApiOperation({ summary: 'Devuelve un ternero por id_ternero' })
  @ApiParam({
    name: 'id_ternero',
    description: 'Código único id_ternero del ternero',
  })
  async findOne(@Param('id_ternero') id_ternero: string, @Req() req: any) {
    return this.ternerosService.findOne(
      +id_ternero,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ACTUALIZAR TERNERO (solo admin y veterinario)
  // ============================================================
  @Patch('/patch-ternero-by-id/:id_ternero')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario'
  @ApiOperation({
    summary: 'Servicio para actualizar un ternero por id_ternero',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'Código único id_ternero',
  })
  @ApiBody({ type: UpdateTerneroDto })
  async update(
    @Param('id_ternero') id_ternero: string,
    @Body() updateTerneroDto: UpdateTerneroDto,
    @Req() req: any,
  ) {
    return this.ternerosService.update(
      +id_ternero,
      updateTerneroDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ACTUALIZAR CALOSTRADO (solo admin y veterinario)
  // ============================================================
  @Patch('/calostrado/:id_ternero')
  @Roles('admin', 'veterinario')
  @ApiOperation({
    summary: 'Actualizar información de calostrado del ternero',
    description:
      'Permite actualizar específicamente los datos de administración de calostrado de un ternero',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero al que se le actualizará el calostrado',
  })
  @ApiBody({ type: UpdateCalostradoDto })
  @ApiResponse({
    status: 200,
    description: 'Datos de calostrado actualizados exitosamente',
  })
  async actualizarCalostrado(
    @Param('id_ternero') id_ternero: string,
    @Body() updateCalostradoDto: UpdateCalostradoDto,
    @Req() req: any,
  ) {
    return this.ternerosService.actualizarCalostrado(
      +id_ternero,
      updateCalostradoDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // AGREGAR PESO DIARIO (todos los roles)
  // ============================================================
  @Post('/peso-diario/:id_ternero')
  @ApiOperation({
    summary: 'Agregar peso diario del ternero',
    description:
      'Registra el peso actual del ternero para seguimiento diario de crecimiento',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero al que se le agregará el peso',
  })
  @ApiBody({ type: AddPesoDiarioDto })
  @ApiResponse({
    status: 200,
    description: 'Peso agregado exitosamente',
  })
  async agregarPesoDiario(
    @Param('id_ternero') id_ternero: string,
    @Body() addPesoDiarioDto: AddPesoDiarioDto,
    @Req() req: any,
  ) {
    return this.ternerosService.agregarPesoDiario(
      +id_ternero,
      addPesoDiarioDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // HISTORIAL COMPLETO
  // ============================================================
  @Get('/historial-completo/:id_ternero')
  @ApiOperation({
    summary: 'Obtener historial completo de pesos con estadísticas',
    description:
      'Devuelve el historial completo de pesajes con estadísticas de crecimiento',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial completo obtenido exitosamente',
    type: HistorialPesosResponseDto,
  })
  async obtenerHistorialCompleto(
    @Param('id_ternero') id_ternero: string,
    @Req() req: any,
  ): Promise<HistorialPesosResponseDto> {
    return this.ternerosService.obtenerHistorialCompleto(
      +id_ternero,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ENDPOINTS LEGACY (sin cambios de permisos)
  // ============================================================
  @Post('/agregar-pesaje/:id_ternero')
  @ApiOperation({
    summary: 'Agregar un pesaje diario al ternero (método legacy)',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero al que se le agregará el pesaje',
  })
  @ApiBody({
    description: 'Datos del pesaje diario',
    schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', example: '07/07' },
        peso: { type: 'number', example: 39.2 },
        observaciones: { type: 'string', example: 'Ternero muy activo hoy' },
      },
      required: ['fecha', 'peso'],
    },
  })
  async agregarPesaje(
    @Param('id_ternero') id_ternero: string,
    @Body() pesajeDto: AgregarPesajeDto,
  ) {
    return this.ternerosService.agregarPesaje(
      +id_ternero,
      pesajeDto.fecha,
      pesajeDto.peso,
      pesajeDto.observaciones,
    );
  }

  @Get('/historial-pesajes/:id_ternero')
  @ApiOperation({
    summary:
      'Obtener historial simple de pesajes de un ternero (método legacy)',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero',
  })
  async obtenerHistorialPesajes(@Param('id_ternero') id_ternero: string) {
    return this.ternerosService.obtenerHistorialPesajes(+id_ternero);
  }

  // ============================================================
  // ELIMINAR TERNERO (solo admin)
  // ============================================================
  @Delete('/delete-ternero-by-id/:id_ternero')
  @Roles('admin')
  @ApiOperation({ summary: 'Proceso que elimina a ternero por id_ternero' })
  @ApiParam({
    name: 'id_ternero',
    description: 'Código único id_ternero.',
  })
  async remove(@Param('id_ternero') id_ternero: string, @Req() req: any) {
    return this.ternerosService.remove(
      +id_ternero,
      req.id_establecimiento,
      req.es_admin,
    );
  }
}
