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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitacionesService } from './invitaciones.service';
import { CrearInvitacionDto } from './dto/crear-invitacion.dto';
// Asegúrate que la ruta al Guard sea correcta (a veces está en modules/auth o shared)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entity/users.entity';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';

@ApiTags('Invitaciones')
@Controller('invitaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvitacionesController {
  constructor(
    private readonly invitacionesService: InvitacionesService,
    @InjectRepository(UserEstablecimientoEntity)
    private readonly userEstablecimientoRepository: Repository<UserEstablecimientoEntity>,
  ) {}

  private async verificarPertenencia(req: any, id: number): Promise<void> {
    // Camino barato: el token ya apunta a ese establecimiento o lo lista.
    // Si no, consultamos la DB (cubre establecimientos creados/asignados
    // después de emitido el JWT, ej. recién creado en la misma sesión).
    const userEstabs = (req.user?.userEstablecimientos || []).map(
      (ue: any) => ue.establecimientoId,
    );
    if (req.user?.id_establecimiento === id || userEstabs.includes(id)) return;

    const enDb = await this.userEstablecimientoRepository.findOne({
      where: { userId: req.user?.userId, establecimientoId: id },
    });
    if (!enDb) {
      throw new ForbiddenException('No tenés acceso a este establecimiento');
    }
  }

  @Post('crear/:establecimientoId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Invitar usuario por email' })
  async crear(
    @Param('establecimientoId', ParseIntPipe) id: number,
    @Body() body: CrearInvitacionDto,
    @Req() req: any,
  ) {
    await this.verificarPertenencia(req, id);
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
    await this.verificarPertenencia(req, id);
    return await this.invitacionesService.getPendientes(id);
  }

  @Delete('revocar/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revocar (eliminar) una invitación pendiente' })
  async revocar(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userEstabs = (req.user?.userEstablecimientos || []).map(
      (ue: any) => ue.establecimientoId,
    );
    return await this.invitacionesService.revocar(id, req.user?.id_establecimiento, userEstabs);
  }
}
