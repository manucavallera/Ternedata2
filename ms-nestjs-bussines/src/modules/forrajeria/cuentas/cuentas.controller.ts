import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreatePagoForrajeriaDto } from './dto/create-pago.dto';
import { CuentasService } from './cuentas.service';

@ApiTags('Forrajería - Cuentas')
@ApiBearerAuth()
@Controller('forrajeria/cuentas')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard, RolesGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
@Roles('admin', 'veterinario', 'operario')
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  @Get('saldos')
  getSaldos(@Req() req: any) {
    return this.cuentasService.getSaldos(req.id_establecimiento);
  }

  @Get('clientes/:idContacto')
  getCuenta(@Req() req: any, @Param('idContacto', ParseIntPipe) idContacto: number) {
    return this.cuentasService.getCuenta(req.id_establecimiento, idContacto);
  }

  // Cobrar mueve plata: solo el dueño.
  @Post('clientes/:idContacto/pagos')
  @Roles('admin')
  registrarPago(
    @Req() req: any,
    @Param('idContacto', ParseIntPipe) idContacto: number,
    @Body() dto: CreatePagoForrajeriaDto,
  ) {
    return this.cuentasService.registrarPago(req.id_establecimiento, idContacto, dto);
  }

  // Cuenta de un proveedor (mismo cálculo; saldo negativo = le debemos). Solo el dueño.
  @Get('proveedores/:idContacto')
  @Roles('admin')
  getCuentaProveedor(@Req() req: any, @Param('idContacto', ParseIntPipe) idContacto: number) {
    return this.cuentasService.getCuenta(req.id_establecimiento, idContacto);
  }

  @Post('proveedores/:idContacto/pagos')
  @Roles('admin')
  registrarPagoProveedor(
    @Req() req: any,
    @Param('idContacto', ParseIntPipe) idContacto: number,
    @Body() dto: CreatePagoForrajeriaDto,
  ) {
    return this.cuentasService.registrarPagoProveedor(req.id_establecimiento, idContacto, dto);
  }
}
