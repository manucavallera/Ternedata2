import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HistorialService } from './historial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard)
@ApiTags('Historial')
@Controller('historial')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('snapshot')
  @ApiOperation({
    summary: 'Estado completo del rodeo (madres/terneros/rodeos/tratamientos/eventos) a fecha pasada',
  })
  async snapshot(@Query('fecha') fecha: string, @Req() req: any) {
    return this.historialService.snapshot(req.id_establecimiento, fecha);
  }

  @Get('dias-con-cambios')
  @ApiOperation({
    summary: 'Fechas con al menos un cambio en el rango, para resaltar en el calendario',
  })
  async diasConCambios(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Req() req: any,
  ) {
    return this.historialService.diasConCambios(
      req.id_establecimiento,
      desde,
      hasta,
    );
  }
}
