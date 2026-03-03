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
  Req,
  HttpException,
  HttpStatus,
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
import { UserRole } from '../users/entity/users.entity';

@ApiTags('Establecimientos')
@Controller('establecimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EstablecimientosController {
  constructor(
    private readonly establecimientosService: EstablecimientosService,
  ) {}

  // ============================================================
  // 1. CREAR
  // ============================================================
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo establecimiento y ser su dueño' })
  async create(@Body() createDto: CreateEstablecimientoDto, @Req() req: any) {
    return await this.establecimientosService.create(
      createDto,
      req.user.userId,
    );
  }

  // ============================================================
  // 2. LISTAR (Lógica Robusta 🛡️)
  // ============================================================
  @Get()
  @ApiOperation({ summary: 'Obtener mis establecimientos (Dueño o Empleado)' })
  async findAll(@Req() req: any) {
    // 👑 REGLA DE ORO: Si es Super Admin, ve TODO el sistema.
    // Esto elimina la necesidad de hardcodear IDs (1, 2, etc).
    // Asegúrate de que en tu BD el usuario tenga rol 'super_admin' si quieres esto.
    if (req.user.rol === 'super_admin') {
      return await this.establecimientosService.findAll();
    }

    // 👷 MORTALES: Ven sus propiedades + donde trabajan
    return await this.establecimientosService.findAllMyEstablecimientos(
      req.user.userId,
    );
  }

  // ... (El resto de métodos switchEstablecimiento, getEstadisticas, update, remove quedan igual)

  @Put(':id/switch')
  @ApiOperation({
    summary: 'Entrar a trabajar en un establecimiento específico',
  })
  async switchEstablecimiento(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const misCampos =
      await this.establecimientosService.findAllMyEstablecimientos(
        req.user.userId,
      );
    // Verificamos si el ID solicitado está en la lista de campos permitidos (ya sea como dueño o empleado)
    const tienePermiso = misCampos.some((e) => e.id_establecimiento === id);

    if (!tienePermiso) {
      throw new HttpException(
        'No tienes permiso para acceder a este establecimiento',
        HttpStatus.FORBIDDEN,
      );
    }
    return { message: `Cambiado al establecimiento ${id}`, activeId: id };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getEstadisticas() {
    return await this.establecimientosService.getEstadisticas();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.establecimientosService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstablecimientoDto,
  ) {
    return await this.establecimientosService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.establecimientosService.remove(id);
    return { message: 'Establecimiento eliminado correctamente' };
  }
}
