import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EstablecimientoGuard } from '../../auth/establecimiento.guard';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { OrganizacionTipoGuard } from '../../auth/organizacion-tipo.guard';
import { OrganizacionTipoRequerido } from '../../auth/organizacion-tipo.decorator';
import { OrganizacionTipo } from '../../establecimientos/organizacion-tipo.enum';
import { CreateContactoForrajeriaDto } from './dto/create-contacto.dto';
import { UpdateContactoForrajeriaDto } from './dto/update-contacto.dto';
import { ContactosService } from './contactos.service';
import { TipoContacto } from './entities/contacto.entity';

@ApiTags('Forrajería - Contactos')
@ApiBearerAuth()
@Controller('forrajeria/contactos')
@UseGuards(JwtAuthGuard, EstablecimientoGuard, OrganizacionTipoGuard)
@OrganizacionTipoRequerido(OrganizacionTipo.FORRAJERIA)
export class ContactosController {
  constructor(private readonly contactosService: ContactosService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateContactoForrajeriaDto) {
    return this.contactosService.createContacto(req.id_establecimiento, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query('tipo') tipo?: TipoContacto) {
    return this.contactosService.findContactos(req.id_establecimiento, tipo);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) idContacto: number,
    @Body() dto: UpdateContactoForrajeriaDto,
  ) {
    return this.contactosService.updateContacto(req.id_establecimiento, idContacto, dto);
  }
}
