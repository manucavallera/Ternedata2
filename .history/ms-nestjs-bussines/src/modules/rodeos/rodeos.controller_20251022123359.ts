import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RodeosService } from './rodeos.service';
import { CreateRodeoDto, UpdateRodeoDto } from './dto/rodeos.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'; // ⬅️ AGREGAR

@ApiTags('Rodeos') // ⬅️ AGREGAR (opcional, para agrupar en Swagger)
@ApiBearerAuth() // ⬅️ AGREGAR ESTO (lo más importante)
@Controller('rodeos')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard)
export class RodeosController {
  constructor(private readonly rodeosService: RodeosService) {}

  // ========== LISTAR RODEOS ==========
  @Get('obtener-listado')
  async findAll(
    @Req() req: any,
    @Query('id_establecimiento') idEstablecimientoQuery?: string,
  ) {
    const establecimientoFiltro = idEstablecimientoQuery
      ? parseInt(idEstablecimientoQuery, 10)
      : null;

    return this.rodeosService.findAll(
      req.id_establecimiento,
      req.es_admin,
      establecimientoFiltro,
    );
  }

  // ========== OBTENER UN RODEO ==========
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rodeosService.findOne(id, req.id_establecimiento, req.es_admin);
  }

  // ========== CREAR RODEO ==========
  @Post()
  @Roles('admin', 'veterinario')
  async create(@Body() createRodeoDto: CreateRodeoDto, @Req() req: any) {
    return this.rodeosService.create(
      createRodeoDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ========== ACTUALIZAR RODEO ==========
  @Put(':id')
  @Roles('admin', 'veterinario')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRodeoDto: UpdateRodeoDto,
    @Req() req: any,
  ) {
    return this.rodeosService.update(
      id,
      updateRodeoDto,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ========== TOGGLE ESTADO ==========
  @Patch(':id/toggle-estado')
  @Roles('admin', 'veterinario')
  async toggleEstado(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rodeosService.toggleEstado(
      id,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ========== ELIMINAR RODEO ==========
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.rodeosService.remove(id, req.id_establecimiento, req.es_admin);
    return { message: 'Rodeo eliminado correctamente' };
  }

  // ========== OBTENER TERNEROS DEL RODEO ==========
  @Get(':id/terneros')
  async getTerneros(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rodeosService.getTernerosDeRodeo(
      id,
      req.id_establecimiento,
      req.es_admin,
    );
  }

  // ========== ESTADÍSTICAS DEL RODEO ==========
  @Get(':id/estadisticas')
  async getEstadisticas(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('id_establecimiento') idEstablecimientoQuery?: string,
  ) {
    // Si es admin Y tiene query param, usar ese establecimiento
    // Si no, usar el del request
    const establecimientoFiltro = idEstablecimientoQuery
      ? parseInt(idEstablecimientoQuery, 10)
      : req.id_establecimiento;

    return this.rodeosService.getEstadisticas(
      id,
      establecimientoFiltro, // ✅ Pasar el filtro correcto
      req.es_admin,
    );
  }
}

// ========== ASIGNAR TERNEROS A UN RODEO ==========
@Post(':id/asignar-terneros')
@Roles('admin', 'veterinario')
async asignarTerneros(
  @Param('id', ParseIntPipe) idRodeo: number,
  @Body() body: { ids_terneros: number[] },
  @Req() req: any,
) {
  return this.rodeosService.asignarTerneros(
    idRodeo,
    body.ids_terneros,
    req.id_establecimiento,
    req.es_admin,
  );
}

// ========== DESASIGNAR TERNEROS DE UN RODEO ==========
@Post(':id/desasignar-terneros')
@Roles('admin', 'veterinario')
async desasignarTerneros(
  @Param('id', ParseIntPipe) idRodeo: number,
  @Body() body: { ids_terneros: number[] },
  @Req() req: any,
) {
  return this.rodeosService.desasignarTerneros(
    idRodeo,
    body.ids_terneros,
    req.id_establecimiento,
    req.es_admin,
  );
}

