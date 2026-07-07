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
import { LitrosService } from './litros.service';
import { CreateLitrosDto } from './dto/create-litros.dto';
import { UpdateLitrosDto } from './dto/update-litros.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard)
@ApiTags('Litros')
@Controller('litros')
export class LitrosController {
  constructor(private readonly litrosService: LitrosService) {}

  @Post('registrar')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Registrar litros de un día' })
  async registrar(@Body() dto: CreateLitrosDto, @Req() req: any) {
    return this.litrosService.registrar(dto, req.id_establecimiento);
  }

  @Get('listado')
  @ApiOperation({ summary: 'Listar registros de litros del establecimiento' })
  async findAll(@Req() req: any) {
    return this.litrosService.findAll(req.id_establecimiento);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Último registro + total + cantidad de vacas + promedio por vaca',
  })
  async getStats(@Req() req: any) {
    return this.litrosService.getStats(req.id_establecimiento);
  }

  @Patch(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Actualizar un registro de litros' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLitrosDto,
    @Req() req: any,
  ) {
    return this.litrosService.update(+id, dto, req.id_establecimiento);
  }

  @Delete(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Eliminar un registro de litros' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.litrosService.remove(+id, req.id_establecimiento);
  }
}
