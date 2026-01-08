import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EstablecimientosService } from './establecimientos.service';
import {
  CreateEstablecimientoDto,
  UpdateEstablecimientoDto,
} from './dto/establecimiento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

// Importar los roles desde donde los tengas definidos
enum UserRole {
  ADMIN = 'admin',
  VETERINARIO = 'veterinario',
  OPERARIO = 'operario',
}

@ApiTags('Establecimientos')
@Controller('establecimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EstablecimientosController {
  constructor(
    private readonly establecimientosService: EstablecimientosService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear establecimiento (solo admin)' })
  async create(@Body() createDto: CreateEstablecimientoDto) {
    return await this.establecimientosService.create(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO)
  @ApiOperation({ summary: 'Obtener todos los establecimientos' })
  async findAll() {
    return await this.establecimientosService.findAll();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de establecimientos' })
  async getEstadisticas() {
    return await this.establecimientosService.getEstadisticas();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO)
  @ApiOperation({ summary: 'Obtener establecimiento por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.establecimientosService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar establecimiento (solo admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstablecimientoDto,
  ) {
    return await this.establecimientosService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar establecimiento (solo admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.establecimientosService.remove(id);
    return { message: 'Establecimiento eliminado correctamente' };
  }
}
