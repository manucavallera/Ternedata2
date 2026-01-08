// ms-nestjs-business/src/modules/madres/madres.controller.ts
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
  Query,
} from '@nestjs/common';
import { MadresService } from './madres.service';
import { CreateMadreDto } from './dto/create-madre.dto';
import { UpdateMadreDto } from './dto/update-madre.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ⭐ GUARDS EN ORDEN
@ApiTags('Madres-De-Terneros')
@Controller('madres')
export class MadresController {
  constructor(private readonly madresService: MadresService) {}

  // ============================================================
  // CREAR MADRE (solo admin y veterinario)
  // ============================================================
  @Post('crear-madre')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Servicio para crear una madre' })
  @ApiBody({ type: CreateMadreDto })
  async create(@Body() createMadreDto: CreateMadreDto, @Req() req: any) {
    console.log('🔍 DEBUG CREATE MADRE:');
    console.log('  - req.id_establecimiento:', req.id_establecimiento);
    console.log('  - req.es_admin:', req.es_admin);
    console.log('  - createMadreDto:', createMadreDto);

    const madreData = {
      ...createMadreDto,
      // ⬅️ CORREGIDO: Priorizar el del DTO, si no existe usar el del JWT
      id_establecimiento:
        createMadreDto.id_establecimiento || req.id_establecimiento,
    };

    console.log('  - madreData final:', madreData);

    return this.madresService.create(madreData);
  }

  // ============================================================
  // LISTAR MADRES DEL ESTABLECIMIENTO
  // ============================================================
  @Get('/obtener-listado-madres')
  @ApiOperation({
    summary: 'Trae listado de todas las madres del establecimiento',
  })
  async findAll(
    @Req() req: any,
    @Query('id_establecimiento') idEstablecimientoQuery?: string,
  ) {
    const establecimientoFiltro = idEstablecimientoQuery
      ? parseInt(idEstablecimientoQuery, 10)
      : null;

    console.log(
      '🔍 Controller Madres - ID del usuario:',
      req.id_establecimiento,
      'Es Admin:',
      req.es_admin,
    );
    console.log('📥 Query Param recibido:', establecimientoFiltro);

    return this.madresService.findAll(
      req.id_establecimiento,
      req.es_admin,
      establecimientoFiltro,
    );
  }

  // ============================================================
  // VER UNA MADRE
  // ============================================================
  @Get('/get-madre-by-id/:id_madre')
  @ApiOperation({ summary: 'Devuelve una madre por id_madre' })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id de la madre',
  })
  async findOne(@Param('id_madre') id_madre: string, @Req() req: any) {
    return this.madresService.findOne(
      +id_madre,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ACTUALIZAR MADRE (solo admin y veterinario)
  // ============================================================
  @Patch('/patch-madre-by-id/:id_madre')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar operario
  @ApiOperation({ summary: 'Servicio para actualizar una madre por id_madre' })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id_madre',
  })
  @ApiBody({ type: UpdateMadreDto })
  async update(
    @Param('id_madre') id_madre: string,
    @Body() updateMadreDto: UpdateMadreDto,
    @Req() req: any,
  ) {
    return this.madresService.update(
      +id_madre,
      updateMadreDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ELIMINAR MADRE (solo admin)
  // ============================================================
  @Delete('/delete-madre-by-id/:id_madre')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar operario y veterinario
  @ApiOperation({ summary: 'Proceso que elimina a madre por id_madre' })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id_madre.',
  })
  async remove(@Param('id_madre') id_madre: string, @Req() req: any) {
    return this.madresService.remove(
      +id_madre,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ============================================================
  // ESTADÍSTICAS DE MADRES
  // ============================================================
  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de madres del establecimiento',
  })
  async getEstadisticas(@Req() req: any) {
    return this.madresService.getEstadisticas(
      req.id_establecimiento,
      req.es_admin,
    );
  }
}
