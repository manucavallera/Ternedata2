// src/modules/resumen-salud/resumen-salud.controller.ts
import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
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
async obtenerResumenSalud(
  @Req() req: any,
  @Query('id_establecimiento') idEstablecimientoQuery?: string,
): Promise<ResumenSaludDto> {
  const establecimientoFiltro = idEstablecimientoQuery
    ? parseInt(idEstablecimientoQuery, 10)
    : null;

  console.log(
    '🔍 Controller Resumen Salud - ID del usuario:',
    req.id_establecimiento,
    'Es Admin:',
    req.es_admin,
  );
  console.log('📥 Query Param recibido:', establecimientoFiltro);

  return this.resumenSaludService.obtenerResumenSalud(
    req.id_establecimiento,
    req.es_admin,
    establecimientoFiltro,
  );
}