import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { CreateMultipleEventosDto } from './dto/create-multiple-eventos.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ✅ Orden correcto de guards
@ApiTags('Eventos-terneros')
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post('crear-evento')
  @Roles('admin', 'veterinario') // ✅ Solo admin y veterinario pueden crear
  @ApiOperation({
    summary: 'Servicio para crear un evento individual',
  })
  @ApiBody({ type: CreateEventoDto })
  async create(@Body() createEventoDto: CreateEventoDto, @Req() req: any) {
    return this.eventosService.create({
      ...createEventoDto,
      id_establecimiento: req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
    });
  }

  @Post('crear-multiples-eventos')
  @Roles('admin', 'veterinario') // ✅ Solo admin y veterinario pueden crear
  @ApiOperation({
    summary: 'Servicio para crear múltiples eventos de una vez',
    description:
      'Permite crear varios eventos simultáneamente. Cada evento puede tener sus propios terneros y madres específicos.',
  })
  @ApiBody({
    type: CreateMultipleEventosDto,
    description: 'Array de eventos, cada uno con sus propios animales',
    examples: {
      ejemplo: {
        summary: 'Ejemplo de múltiples eventos',
        value: {
          eventos: [
            {
              fecha_evento: '2024-06-01',
              observacion: 'Vacunación grupo A',
              id_ternero: [1, 2, 3],
              id_madre: [1, 2],
            },
            {
              fecha_evento: '2024-06-05',
              observacion: 'Control veterinario grupo B',
              id_ternero: [4, 5, 6],
              id_madre: [3, 4],
            },
          ],
        },
      },
    },
  })
  async createMultiple(
    @Body() createMultipleEventosDto: CreateMultipleEventosDto,
    @Req() req: any,
  ) {
    return this.eventosService.createMultiple({
      ...createMultipleEventosDto,
      id_establecimiento: req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
    });
  }

  @Get('/obtener-listado-eventos')
  @ApiOperation({
    summary: 'Este servicio trae listado de todos los eventos',
  })
  async findAll(@Req() req: any) {
    return this.eventosService.findAll(
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/get-evento-by-id/:id_evento')
  @ApiOperation({
    summary: 'Devuelve un evento por id_evento',
  })
  @ApiParam({
    name: 'id_evento',
    description: 'Código único id del evento',
  })
  async findOne(@Param('id_evento') id_evento: string, @Req() req: any) {
    return this.eventosService.findOne(
      +id_evento,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Patch('/patch-evento-by-id/:id_evento')
  @Roles('admin', 'veterinario') // ✅ Solo admin y veterinario pueden actualizar
  @ApiOperation({
    summary: 'Servicio para actualizar un evento por id_evento',
  })
  @ApiParam({
    name: 'id_evento',
    description: 'Código único id_evento',
  })
  @ApiBody({ type: UpdateEventoDto })
  async update(
    @Param('id_evento') id_evento: string,
    @Body() updateEventoDto: UpdateEventoDto,
    @Req() req: any,
  ) {
    return this.eventosService.update(
      +id_evento,
      updateEventoDto,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Delete('/delete-evento-by-id/:id_evento')
  @Roles('admin') // ✅ Solo admin puede eliminar
  @ApiOperation({
    summary: 'Proceso que elimina un evento por id_evento',
  })
  @ApiParam({
    name: 'id_evento',
    description: 'Código único id_evento.',
  })
  async remove(@Param('id_evento') id_evento: string, @Req() req: any) {
    return this.eventosService.remove(
      +id_evento,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }
}
