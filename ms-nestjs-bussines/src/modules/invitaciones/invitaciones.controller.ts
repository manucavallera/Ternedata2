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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from '../invitaciones/roles.enum';
// Asegúrate que la ruta al Guard sea correcta (a veces está en modules/auth o shared)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Invitaciones')
@Controller('invitaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvitacionesController {
  constructor(private readonly invitacionesService: InvitacionesService) {}

  @Post('crear/:establecimientoId')
  @ApiOperation({ summary: 'Invitar usuario por email' })
  async crear(
    @Param('establecimientoId', ParseIntPipe) id: number,
    // 👇 1. AGREGAMOS "email" AQUÍ PARA RECIBIRLO
    @Body() body: { email: string; rol: RolEstablecimiento },
    @Req() req: any,
  ) {
    // 👇👇👇 AGREGAR ESTOS LOGS OBLIGATORIAMENTE 👇👇👇
    console.log('🚀 LLEGÓ LA PETICIÓN AL CONTROLADOR');
    console.log('🏢 ID Establecimiento:', id);
    console.log('📦 Datos recibidos (Body):', body);
    // 👆👆👆
    // 👇 2. PASAMOS EL EMAIL AL SERVICIO (Asegúrate de actualizar tu servicio también)
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

  @Get('pendientes/:establecimientoId')
  @ApiOperation({ summary: 'Ver invitaciones pendientes de un establecimiento' })
  async pendientes(
    @Param('establecimientoId', ParseIntPipe) id: number,
  ) {
    return await this.invitacionesService.getPendientes(id);
  }

  @Delete('revocar/:id')
  @ApiOperation({ summary: 'Revocar (eliminar) una invitación pendiente' })
  async revocar(@Param('id', ParseIntPipe) id: number) {
    return await this.invitacionesService.revocar(id);
  }
}
