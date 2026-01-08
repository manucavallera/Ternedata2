// src/modules/resumen-salud/resumen-salud.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ResumenSaludService, ResumenSaludDto } from './resumen-salud.service';

@ApiTags('Resumen de Salud')
@Controller('resumen-salud')
export class ResumenSaludController {
  constructor(private readonly resumenSaludService: ResumenSaludService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener resumen consolidado de salud del rodeo',
    description:
      'Retorna métricas de mortalidad, morbilidad, tratamientos y diarreas',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de salud obtenido exitosamente',
  })
  async obtenerResumenSalud(): Promise<ResumenSaludDto> {
    return this.resumenSaludService.obtenerResumenSalud();
  }
}
