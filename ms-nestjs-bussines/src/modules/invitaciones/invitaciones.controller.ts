import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from '../invitaciones/roles.enum';
// Asegúrate que la ruta al Guard sea correcta (a veces está en modules/auth o shared)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entity/users.entity';

@ApiTags('Invitaciones')
@Controller('invitaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvitacionesController {
  constructor(private readonly invitacionesService: InvitacionesService) {}

  @Post('crear/:establecimientoId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invitar usuario por email' })
  async crear(
    @Param('establecimientoId', ParseIntPipe) id: number,
    @Body() body: { email: string; rol: RolEstablecimiento },
    @Req() req: any,
  ) {
    // H10: el admin solo puede invitar a establecimientos a los que pertenece
    const userEstabs = (req.user?.userEstablecimientos || []).map(
      (ue: any) => ue.establecimientoId,
    );
    const puedeAcceder =
      req.user?.id_establecimiento === id || userEstabs.includes(id);
    if (!puedeAcceder) {
      throw new ForbiddenException('No tenés acceso a este establecimiento');
    }
    return await this.invitacionesService.generarLink(id, body.rol, body.email);
  }

  @Post('aceptar')
  @ApiOperation({ summary: 'Aceptar invitación con token' })
  async aceptar(@Body() body: { token: string }, @Req() req: any) {
    return await this.invitacionesService.aceptarLink(
      body.token,
      req.user.userId,
    );
  }

  @Post('aceptar-automatico')
  @ApiOperation({ summary: 'Acepta todas las invitaciones pendientes para el email del usuario logueado' })
  async aceptarAutomatico(@Req() req: any) {
    return await this.invitacionesService.aceptarPorEmail(req.user.userId);
  }

  @Get('pendientes/:establecimientoId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver invitaciones pendientes de un establecimiento' })
  async pendientes(
    @Param('establecimientoId', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userEstabs = (req.user?.userEstablecimientos || []).map(
      (ue: any) => ue.establecimientoId,
    );
    const puedeAcceder =
      req.user?.id_establecimiento === id || userEstabs.includes(id);
    if (!puedeAcceder) {
      throw new ForbiddenException('No tenés acceso a este establecimiento');
    }
    return await this.invitacionesService.getPendientes(id);
  }

  @Delete('revocar/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revocar (eliminar) una invitación pendiente' })
  async revocar(@Param('id', ParseIntPipe) id: number) {
    return await this.invitacionesService.revocar(id);
  }
}
