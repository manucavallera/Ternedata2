import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoEstadoDto } from './dto/update-pedido-estado.dto';
import { VentasService } from './ventas.service';

@ApiTags('Forrajería - Ventas')
@ApiBearerAuth()
@Controller('forrajeria/pedidos')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePedidoDto) {
    return this.ventasService.createPedido(req.id_establecimiento, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.ventasService.findPedidos(req.id_establecimiento);
  }

  @Patch(':id/estado')
  updateEstado(
    @Req() req: any,
    @Param('id', ParseIntPipe) idPedido: number,
    @Body() dto: UpdatePedidoEstadoDto,
  ) {
    return this.ventasService.cambiarEstado(req.id_establecimiento, idPedido, dto.estado);
  }
}

