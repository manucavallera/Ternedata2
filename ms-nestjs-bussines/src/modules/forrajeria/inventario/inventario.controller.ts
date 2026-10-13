import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { CreateMovimientoStockDto } from './dto/create-movimiento-stock.dto';
import { InventarioService } from './inventario.service';

@ApiTags('Forrajería - Inventario')
@ApiBearerAuth()
@Controller('forrajeria/inventario')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('productos/:idProducto/movimientos')
  registrarMovimiento(
    @Req() req: any,
    @Param('idProducto', ParseIntPipe) idProducto: number,
    @Body() dto: CreateMovimientoStockDto,
  ) {
    return this.inventarioService.registrarMovimiento(
      req.id_establecimiento,
      idProducto,
      dto,
    );
  }

  @Get('movimientos')
  findMovimientos(@Req() req: any, @Query('id_producto') idProducto?: string) {
    return this.inventarioService.findMovimientos(
      req.id_establecimiento,
      idProducto ? Number(idProducto) : undefined,
    );
  }

  @Get('bajo-stock')
  findBajoStock(@Req() req: any) {
    return this.inventarioService.findBajoStock(req.id_establecimiento);
  }
}
