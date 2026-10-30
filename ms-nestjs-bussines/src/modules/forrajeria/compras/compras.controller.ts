import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateCompraDto } from './dto/create-compra.dto';
import { ComprasService } from './compras.service';

// Compras mueven plata, costos y deuda con proveedores: solo el dueño.
@ApiTags('Forrajería - Compras')
@ApiBearerAuth()
@Controller('forrajeria/compras')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard, RolesGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
@Roles('admin')
export class ComprasController {
  constructor(private readonly comprasService: ComprasService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCompraDto) {
    return this.comprasService.createCompra(req.id_establecimiento, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('id_proveedor') idProveedor?: string) {
    const id_proveedor = idProveedor ? Number(idProveedor) : undefined;
    if (idProveedor && !Number.isInteger(id_proveedor)) throw new BadRequestException('id_proveedor inválido');
    return this.comprasService.findCompras(req.id_establecimiento, { id_proveedor });
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) idCompra: number) {
    return this.comprasService.findCompra(req.id_establecimiento, idCompra);
  }
}
