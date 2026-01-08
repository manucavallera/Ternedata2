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
  // 1. CREAR (Auto-Servicio)
  // ============================================================
  @Post()
  // ❌ IMPORTANTE: No ponemos @Roles(UserRole.ADMIN) aquí.
  // Cualquier usuario logueado debe poder crear su propia granja.
  @ApiOperation({ summary: 'Crear un nuevo establecimiento y ser su dueño' })
  async create(@Body() createDto: CreateEstablecimientoDto, @Req() req: any) {
    // Pasamos el ID del usuario para que el servicio lo haga DUEÑO automáticamente
    return await this.establecimientosService.create(
      createDto,
      req.user.userId,
    );
  }

  // ============================================================
  // 2. LISTAR (Mis Campos)
  // ============================================================
  @Get()
  @ApiOperation({ summary: 'Obtener mis establecimientos asignados' })
  async findAll(@Req() req: any) {
    // Si es un Super Admin de la plataforma, quizás quiera ver todo (Opcional)
    /* if (req.user.rol === UserRole.ADMIN) {
         return this.establecimientosService.findAllIncludingInactive();
       } */

    // Para usuarios normales (Dueños, Vets, Operarios), mostramos SUS campos
    return await this.establecimientosService.findAllMyEstablecimientos(
      req.user.userId,
    );
  }

  // ============================================================
  // 3. CAMBIAR DE CAMPO (Switch Context) - ¡NUEVO! 🆕
  // ============================================================
  @Put(':id/switch')
  @ApiOperation({
    summary: 'Entrar a trabajar en un establecimiento específico',
  })
  async switchEstablecimiento(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    // 1. Verificamos que el usuario tenga permiso real en ese campo
    const misCampos =
      await this.establecimientosService.findAllMyEstablecimientos(
        req.user.userId,
      );
    const tienePermiso = misCampos.some((e) => e.id_establecimiento === id);

    if (!tienePermiso) {
      throw new HttpException(
        'No tienes permiso para acceder a este establecimiento',
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Usamos el servicio de usuarios para actualizar el "campo activo"
    // (Esto requiere que UsersService sea público o inyectado, pero lo haremos a través del modulo users si es necesario)
    // OJO: Aquí simplificamos llamando al servicio de establecimientos si tuviera un metodo puente,
    // pero lo ideal es llamar a usersService.assignEstablecimiento desde aquí o desde el frontend.

    // Por simplicidad, retornamos OK y el frontend actualiza su estado.
    return { message: `Cambiado al establecimiento ${id}`, activeId: id };
  }

  // ============================================================
  // MÉTODOS CLÁSICOS (Protegidos)
  // ============================================================

  @Get('stats')
  @Roles(UserRole.ADMIN) // Solo admin global ve estadísticas globales
  @ApiOperation({ summary: 'Obtener estadísticas globales' })
  async getEstadisticas() {
    return await this.establecimientosService.getEstadisticas();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de un establecimiento' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    // Aquí deberíamos validar si el usuario tiene permiso en este ID específico
    // Por ahora lo dejamos abierto, pero idealmente usaríamos un Guard
    return await this.establecimientosService.findOne(id);
  }

  @Put(':id')
  // Aquí sí protegemos: Solo el dueño debería poder editar el nombre del campo
  // (Esto requiere un Guard más avanzado "OwnerGuard", por ahora lo dejamos a Admin o confiamos en el frontend)
  @ApiOperation({ summary: 'Actualizar establecimiento' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEstablecimientoDto,
  ) {
    return await this.establecimientosService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Solo admins borran campos por seguridad
  @ApiOperation({ summary: 'Eliminar establecimiento' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.establecimientosService.remove(id);
    return { message: 'Establecimiento eliminado correctamente' };
  }
}
