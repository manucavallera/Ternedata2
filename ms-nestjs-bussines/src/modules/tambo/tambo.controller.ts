import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrganizacionTipoRequerido } from '../auth/organizacion-tipo.decorator';
import { OrganizacionTipoGuard } from '../auth/organizacion-tipo.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrganizacionTipo } from '../establecimientos/organizacion-tipo.enum';
import { CreateEventoReproductivoDto } from './dto/create-evento-reproductivo.dto';
import { UpdateConfigTamboDto } from './dto/update-config-tambo.dto';
import { TamboService } from './tambo.service';

function idOpcional(valor?: string, nombre = 'id') {
  if (!valor) return undefined;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0)
    throw new BadRequestException(`${nombre} inválido`);
  return n;
}

@ApiTags('Tambo')
@ApiBearerAuth()
@Controller('tambo')
@UseGuards(
  JwtAuthGuard,
  EstablecimientoGuard,
  OrganizacionTipoGuard,
  RolesGuard,
)
@OrganizacionTipoRequerido(OrganizacionTipo.GANADERIA)
export class TamboController {
  constructor(private readonly tamboService: TamboService) {}

  @Get('rodeo')
  rodeo(@Req() req: any, @Query('id_rodeo') idRodeo?: string) {
    return this.tamboService.rodeo(
      req.id_establecimiento,
      idOpcional(idRodeo, 'id_rodeo'),
    );
  }

  @Get('pendientes')
  pendientes(@Req() req: any, @Query('id_rodeo') idRodeo?: string) {
    return this.tamboService.pendientes(
      req.id_establecimiento,
      idOpcional(idRodeo, 'id_rodeo'),
    );
  }

  @Get('resumen')
  resumen(@Req() req: any, @Query('id_rodeo') idRodeo?: string) {
    return this.tamboService.resumen(
      req.id_establecimiento,
      idOpcional(idRodeo, 'id_rodeo'),
    );
  }

  @Get('eventos')
  eventos(@Req() req: any, @Query('id_madre') idMadre?: string) {
    return this.tamboService.listarEventos(
      req.id_establecimiento,
      idOpcional(idMadre, 'id_madre'),
    );
  }

  @Post('eventos')
  @Roles('admin', 'veterinario', 'operario')
  crearEvento(@Req() req: any, @Body() dto: CreateEventoReproductivoDto) {
    return this.tamboService.crearEvento(
      req.id_establecimiento,
      dto,
      req.user?.userId,
    );
  }

  @Delete('eventos/:id')
  @Roles('admin', 'veterinario')
  eliminarEvento(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.tamboService.eliminarEvento(req.id_establecimiento, id);
  }

  @Get('configuracion')
  configuracion(@Req() req: any) {
    return this.tamboService.obtenerConfig(req.id_establecimiento);
  }

  @Patch('configuracion')
  @Roles('admin')
  actualizarConfiguracion(@Req() req: any, @Body() dto: UpdateConfigTamboDto) {
    return this.tamboService.actualizarConfig(req.id_establecimiento, dto);
  }
}
