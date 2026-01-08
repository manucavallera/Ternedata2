import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitacionesService } from './invitaciones.service';
import { RolEstablecimiento } from '../users/entity/user-establecimiento.entity';
// Asegúrate que la ruta al Guard sea correcta (a veces está en modules/auth o shared)
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Invitaciones')
@Controller('invitaciones')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvitacionesController {
  constructor(private readonly invitacionesService: InvitacionesService) {}

  @Post('crear/:establecimientoId')
  @ApiOperation({ summary: 'Crear link de invitación (Solo Dueño)' })
  async crear(
    @Param('establecimientoId', ParseIntPipe) id: number,
    @Body() body: { rol: RolEstablecimiento },
    @Req() req: any,
  ) {
    // Aquí podrías agregar una validación extra:
    // if (!userIsOwner(req.user.id, id)) throw Forbidden...
    return await this.invitacionesService.generarLink(id, body.rol);
  }

  @Post('aceptar')
  @ApiOperation({ summary: 'Aceptar invitación con token' })
  async aceptar(@Body() body: { token: string }, @Req() req: any) {
    return await this.invitacionesService.aceptarLink(
      body.token,
      req.user.userId,
    );
  }
}
