import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CatalogoService } from './catalogo.service';
import { CreateCategoriaForrajeriaDto } from './dto/create-categoria.dto';
import { CreateProductoForrajeriaDto } from './dto/create-producto.dto';

@ApiTags('Forrajería - Catálogo')
@ApiBearerAuth()
@Controller('forrajeria')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Post('categorias')
  createCategoria(@Req() req: any, @Body() dto: CreateCategoriaForrajeriaDto) {
    return this.catalogoService.createCategoria(req.id_establecimiento, dto);
  }

  @Get('categorias')
  findCategorias(@Req() req: any) {
    return this.catalogoService.findCategorias(req.id_establecimiento);
  }

  @Post('productos')
  createProducto(@Req() req: any, @Body() dto: CreateProductoForrajeriaDto) {
    return this.catalogoService.createProducto(req.id_establecimiento, dto);
  }

  // Agrega lo que falte del catálogo típico (precio y stock en 0). No duplica.
  @Post('catalogo-base')
  @UseGuards(RolesGuard)
  @Roles('admin')
  cargarCatalogoBase(@Req() req: any) {
    return this.catalogoService.cargarCatalogoBase(req.id_establecimiento);
  }

  @Get('productos')
  findProductos(@Req() req: any) {
    return this.catalogoService.findProductos(req.id_establecimiento);
  }
}
