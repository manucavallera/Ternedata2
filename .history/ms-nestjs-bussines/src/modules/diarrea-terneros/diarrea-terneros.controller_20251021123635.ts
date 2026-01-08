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
  Query, // ⬅️ AGREGAR ESTO
} from '@nestjs/common';
import { DiarreaTernerosService } from './diarrea-terneros.service';
import { CreateDiarreaTerneroDto } from './dto/create-diarrea-ternero.dto';
import { UpdateDiarreaTerneroDto } from './dto/update-diarrea-ternero.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ✅ Orden correcto de guards
@ApiTags('Diarrea-terneros')
@Controller('diarrea-terneros')
export class DiarreaTernerosController {
  constructor(
    private readonly diarreaTernerosService: DiarreaTernerosService,
  ) {}

  @Post('crear-diarrea-ternero')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario
  @ApiOperation({
    summary: 'Registrar episodio de diarrea en ternero',
    description:
      'Crea un nuevo registro de diarrea con contador automático de episodios para seguimiento médico',
  })
  @ApiBody({
    type: CreateDiarreaTerneroDto,
    description: 'Datos del episodio de diarrea',
    examples: {
      ejemplo: {
        summary: 'Episodio de diarrea moderada',
        value: {
          fecha_diarrea_ternero: '2024-06-27',
          severidad: 'Moderada',
          id_ternero: 5,
          observaciones:
            'Ternero presenta deshidratación leve, se inició tratamiento con suero oral',
        },
      },
    },
  })
  async create(
    @Body() createDiarreaTerneroDto: CreateDiarreaTerneroDto,
    @Req() req: any,
  ) {
    // ✅ Logs de debug
    console.log('🎯 Controller CREATE - Llegó el request');
    console.log('📦 Body recibido:', createDiarreaTerneroDto);
    console.log(
      '🏢 ID Establecimiento del body:',
      createDiarreaTerneroDto.id_establecimiento,
    );
    console.log('🏢 ID Establecimiento del request:', req.id_establecimiento);
    console.log('👤 Usuario:', req.user);

    // ✅ CORRECCIÓN: Usar el id_establecimiento del body si existe (admin lo envió)
    // Si no, usar el del request (usuarios normales)
    const id_establecimiento =
      createDiarreaTerneroDto.id_establecimiento || req.id_establecimiento;

    console.log('✅ ID Establecimiento final:', id_establecimiento);

    return this.diarreaTernerosService.create({
      ...createDiarreaTerneroDto,
      id_establecimiento,
    });
  }

  @Get('/obtener-listado-diarrea-terneros')
  @ApiOperation({
    summary: 'Obtener todos los registros de diarrea',
    description:
      'Devuelve el listado completo de episodios de diarrea ordenados por fecha',
  })
  async findAll(
    @Req() req: any,
    @Query('id_establecimiento') idEstablecimientoQuery?: string,
  ) {
    const establecimientoFiltro = idEstablecimientoQuery
      ? parseInt(idEstablecimientoQuery, 10)
      : null;

    console.log(
      '🔍 Controller Diarrea - ID del usuario:',
      req.id_establecimiento,
      'Es Admin:',
      req.es_admin,
    );
    console.log('📥 Query Param recibido:', establecimientoFiltro);

    return this.diarreaTernerosService.findAll(
      req.id_establecimiento,
      req.es_admin,
      establecimientoFiltro,
    );
  }

  @Get('/historial-ternero/:id_ternero')
  @ApiOperation({
    summary: 'Obtener historial de diarreas de un ternero específico',
    description:
      'Devuelve todos los episodios de diarrea de un ternero ordenados por número de episodio',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero para consultar su historial médico',
    example: 5,
  })
  async findByTerneroId(
    @Param('id_ternero') id_ternero: string,
    @Req() req: any,
  ) {
    return this.diarreaTernerosService.findByTerneroId(
      +id_ternero,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/estadisticas-ternero/:id_ternero')
  @ApiOperation({
    summary: 'Obtener estadísticas médicas de diarrea de un ternero',
    description:
      'Análisis completo: total de episodios, severidad predominante, alertas médicas',
  })
  @ApiParam({
    name: 'id_ternero',
    description: 'ID del ternero para análisis estadístico',
    example: 5,
  })
  async getEstadisticasTernero(
    @Param('id_ternero') id_ternero: string,
    @Req() req: any,
  ) {
    return this.diarreaTernerosService.getEstadisticasTernero(
      +id_ternero,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/get-diarrea-ternero-by-id/:id_diarrea_ternero')
  @ApiOperation({
    summary: 'Obtener episodio específico de diarrea',
    description:
      'Devuelve un registro específico de diarrea con toda su información',
  })
  @ApiParam({
    name: 'id_diarrea_ternero',
    description: 'ID único del registro de diarrea',
    example: 1,
  })
  async findOne(
    @Param('id_diarrea_ternero') id_diarrea_ternero: string,
    @Req() req: any,
  ) {
    return this.diarreaTernerosService.findOne(
      +id_diarrea_ternero,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Patch('/patch-diarrea-ternero-by-id/:id_diarrea_ternero')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario'
  @ApiOperation({
    summary: 'Actualizar registro de diarrea',
    description:
      'Modifica un episodio existente (el número de episodio se preserva para mantener historial)',
  })
  @ApiParam({
    name: 'id_diarrea_ternero',
    description: 'ID único del registro a actualizar',
    example: 1,
  })
  @ApiBody({
    type: UpdateDiarreaTerneroDto,
    description: 'Campos a actualizar del registro',
  })
  async update(
    @Param('id_diarrea_ternero') id_diarrea_ternero: string,
    @Body() updateDiarreaTerneroDto: UpdateDiarreaTerneroDto,
    @Req() req: any,
  ) {
    return this.diarreaTernerosService.update(
      +id_diarrea_ternero,
      updateDiarreaTerneroDto,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Delete('/delete-diarrea-by-id/:id_diarrea_ternero')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'veterinario' y 'operario'
  @ApiOperation({
    summary: 'Eliminar registro de diarrea',
    description: 'Elimina permanentemente un episodio de diarrea del sistema',
  })
  @ApiParam({
    name: 'id_diarrea_ternero',
    description: 'ID único del registro a eliminar',
    example: 1,
  })
  async remove(
    @Param('id_diarrea_ternero') id_diarrea_ternero: string,
    @Req() req: any,
  ) {
    return this.diarreaTernerosService.remove(
      +id_diarrea_ternero,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }
}
