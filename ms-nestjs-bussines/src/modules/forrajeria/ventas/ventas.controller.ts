import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolEstablecimientoService } from '../../auth/rol-establecimiento.service';
import { PedidoEstado } from './entities/pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoEstadoDto } from './dto/update-pedido-estado.dto';
import { VentasService } from './ventas.service';

@ApiTags('Forrajería - Ventas')
@ApiBearerAuth()
@Controller('forrajeria/pedidos')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard, RolesGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
@Roles('admin', 'veterinario', 'operario')
export class VentasController {
  constructor(
    private readonly ventasService: VentasService,
    private readonly rolEstablecimiento: RolEstablecimientoService,
  ) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreatePedidoDto) {
    return this.ventasService.createPedido(req.id_establecimiento, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.ventasService.findPedidos(req.id_establecimiento);
  }

  @Patch(':id/estado')
  async updateEstado(
    @Req() req: any,
    @Param('id', ParseIntPipe) idPedido: number,
    @Body() dto: UpdatePedidoEstadoDto,
  ) {
    // Cancelar devuelve stock y anula la venta: solo el dueño.
    if (dto.estado === PedidoEstado.CANCELADO) {
      await this.rolEstablecimiento.exigirAdminDe(req.user, req.id_establecimiento);
    }
    return this.ventasService.cambiarEstado(req.id_establecimiento, idPedido, dto.estado);
  }
}

