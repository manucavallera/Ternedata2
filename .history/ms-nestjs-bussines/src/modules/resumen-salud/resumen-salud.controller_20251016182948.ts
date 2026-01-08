// src/modules/resumen-salud/resumen-salud.controller.ts
import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  Query,
} from '@nestjs/swagger';
import { ResumenSaludService, ResumenSaludDto } from './resumen-salud.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ✅ Orden correcto de guards
@ApiTags('Resumen de Salud')
@Controller('resumen-salud')
export class ResumenSaludController {
  constructor(private readonly resumenSaludService: ResumenSaludService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener resumen consolidado de salud del rodeo',
    description:
      'Retorna métricas de mortalidad, morbilidad, tratamientos y diarreas. Admin ve todos los establecimientos, otros usuarios solo su establecimiento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de salud obtenido exitosamente',
  })
  async obtenerResumenSalud(@Req() req: any): Promise<ResumenSaludDto> {
    return this.resumenSaludService.obtenerResumenSalud(
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }
}
