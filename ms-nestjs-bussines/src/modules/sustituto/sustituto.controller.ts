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
import { SustitutoService } from './sustituto.service';
import { CreateSustitutoDto } from './dto/create-sustituto.dto';
import { UpdateSustitutoDto } from './dto/update-sustituto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard)
@ApiTags('Sustituto')
@Controller('sustituto')
export class SustitutoController {
  constructor(private readonly sustitutoService: SustitutoService) {}

  @Post('registrar')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Registrar un cálculo de sustituto lácteo' })
  async registrar(@Body() dto: CreateSustitutoDto, @Req() req: any) {
    return this.sustitutoService.registrar(dto, req.id_establecimiento);
  }

  @Get('listado')
  @ApiOperation({ summary: 'Listar cálculos de sustituto del establecimiento' })
  async findAll(@Req() req: any) {
    return this.sustitutoService.findAll(req.id_establecimiento);
  }

  @Get('ultimo')
  @ApiOperation({ summary: 'Último cálculo de sustituto con resultados' })
  async getUltimo(@Req() req: any) {
    return this.sustitutoService.getUltimo(req.id_establecimiento);
  }

  @Patch(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Actualizar un cálculo de sustituto' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSustitutoDto,
    @Req() req: any,
  ) {
    return this.sustitutoService.update(+id, dto, req.id_establecimiento);
  }

  @Delete(':id')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Eliminar un cálculo de sustituto' })
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.sustitutoService.remove(+id, req.id_establecimiento);
  }
}
