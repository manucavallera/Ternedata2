import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
import { UpdateCategoriaForrajeriaDto } from './dto/update-categoria.dto';
import { UpdateProductoForrajeriaDto } from './dto/update-producto.dto';

// Cualquiera del equipo ve el catálogo; precios, altas y bajas solo el dueño.
@ApiTags('Forrajería - Catálogo')
@ApiBearerAuth()
@Controller('forrajeria')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard, RolesGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
@Roles('admin', 'veterinario', 'operario')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Post('categorias')
  @Roles('admin')
  createCategoria(@Req() req: any, @Body() dto: CreateCategoriaForrajeriaDto) {
    return this.catalogoService.createCategoria(req.id_establecimiento, dto);
  }

  @Get('categorias')
  findCategorias(@Req() req: any) {
    return this.catalogoService.findCategorias(req.id_establecimiento);
  }

  @Patch('categorias/:id')
  @Roles('admin')
  updateCategoria(
    @Req() req: any,
    @Param('id', ParseIntPipe) idCategoria: number,
    @Body() dto: UpdateCategoriaForrajeriaDto,
  ) {
    return this.catalogoService.updateCategoria(req.id_establecimiento, idCategoria, dto);
  }

  @Post('productos')
  @Roles('admin')
  createProducto(@Req() req: any, @Body() dto: CreateProductoForrajeriaDto) {
    return this.catalogoService.createProducto(req.id_establecimiento, dto);
  }

  @Patch('productos/:id')
  @Roles('admin')
  updateProducto(
    @Req() req: any,
    @Param('id', ParseIntPipe) idProducto: number,
    @Body() dto: UpdateProductoForrajeriaDto,
  ) {
    return this.catalogoService.updateProducto(req.id_establecimiento, idProducto, dto);
  }

  // Agrega lo que falte del catálogo típico (precio y stock en 0). No duplica.
  @Post('catalogo-base')
  @Roles('admin')
  cargarCatalogoBase(@Req() req: any) {
    return this.catalogoService.cargarCatalogoBase(req.id_establecimiento);
  }

  @Get('productos')
  findProductos(@Req() req: any) {
    return this.catalogoService.findProductos(req.id_establecimiento);
  }
}
