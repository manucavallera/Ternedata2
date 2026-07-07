import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DietasService } from './dietas.service';
import { CreateDietaDto } from './dto/create-dieta.dto';
import { UpdateDietaDto } from './dto/update-dieta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard)
@ApiTags('Dietas')
@Controller('dietas')
export class DietasController {
  constructor(private readonly dietasService: DietasService) {}

  @Post('crear')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Crear una dieta para un rodeo' })
  async crear(@Body() dto: CreateDietaDto, @Req() req: any) {
    return this.dietasService.crear(dto, req.id_establecimiento);
  }

  @Get('rodeo/:idRodeo')
  @ApiOperation({ summary: 'Listar dietas de un rodeo (con cálculo de totales)' })
  async listarPorRodeo(@Param('idRodeo') idRodeo: string, @Req() req: any) {
    return this.dietasService.listarPorRodeo(+idRodeo, req.id_establecimiento);
  }

  @Patch(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Actualizar una dieta' })
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateDietaDto,
    @Req() req: any,
  ) {
    return this.dietasService.actualizar(+id, dto, req.id_establecimiento);
  }

  @Delete(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Eliminar una dieta' })
  async eliminar(@Param('id') id: string, @Req() req: any) {
    return this.dietasService.eliminar(+id, req.id_establecimiento);
  }
}
