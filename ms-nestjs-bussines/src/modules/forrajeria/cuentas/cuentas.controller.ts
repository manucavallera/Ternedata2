import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { CreatePagoForrajeriaDto } from './dto/create-pago.dto';
import { CuentasService } from './cuentas.service';

@ApiTags('Forrajería - Cuentas')
@ApiBearerAuth()
@Controller('forrajeria/cuentas')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  @Get('clientes/:idContacto')
  getCuenta(@Req() req: any, @Param('idContacto', ParseIntPipe) idContacto: number) {
    return this.cuentasService.getCuenta(req.id_establecimiento, idContacto);
  }

  @Post('clientes/:idContacto/pagos')
  registrarPago(
    @Req() req: any,
    @Param('idContacto', ParseIntPipe) idContacto: number,
    @Body() dto: CreatePagoForrajeriaDto,
  ) {
    return this.cuentasService.registrarPago(req.id_establecimiento, idContacto, dto);
  }
}
