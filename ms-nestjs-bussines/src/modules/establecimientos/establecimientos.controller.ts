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

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo establecimiento' })
  async create(@Body() createDto: CreateEstablecimientoDto, @Req() req: any) {
    return await this.establecimientosService.create(
      createDto,
      req.user.userId,
    );
  }

  // 👇 MODIFICADO: Usamos el Token para saber dónde trabajas
  @Get()
  @ApiOperation({ summary: 'Obtener mis establecimientos (Dueño o Empleado)' })
  async findAll(@Req() req: any) {
    // 👑 Super Admin ve TODO
    if (req.user.rol === 'super_admin') {
      return await this.establecimientosService.findAll();
    }

    // 👷 Mortales: Pasamos su ID de usuario Y su ID de establecimiento (del token)
    // Nota: req.user viene del JwtStrategy. Asegúrate de que tu estrategia incluya id_establecimiento.
    const establecimientoToken = req.user.id_establecimiento;

    return await this.establecimientosService.findAllMyEstablecimientos(
      req.user.userId,
      establecimientoToken, // 👈 ¡Aquí está la clave!
    );
  }

  @Put(':id/switch')
  @ApiOperation({
    summary: 'Entrar a trabajar en un establecimiento específico',
  })
  async switchEstablecimiento(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    // Obtenemos mis campos permitidos
    const misCampos =
      await this.establecimientosService.findAllMyEstablecimientos(
        req.user.userId,
        req.user.id_establecimiento,
      );

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
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstablecimientoDto,
  ) {
    return await this.establecimientosService.update(id, updateDto);
  }

  @Get(':id/equipo')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener miembros del equipo del establecimiento' })
  async getEquipo(@Param('id', ParseIntPipe) id: number) {
    return await this.establecimientosService.getEquipo(id);
  }

  @Delete(':id/equipo/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar miembro del equipo' })
  async eliminarMiembro(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.establecimientosService.eliminarMiembro(id, userId);
    return { message: 'Miembro eliminado correctamente' };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.establecimientosService.remove(id);
    return { message: 'Establecimiento eliminado correctamente' };
  }
}
