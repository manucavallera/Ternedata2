import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { TratamientosService } from './tratamientos.service';
import {
  CreateTratamientoDto,
  CreateMultiplesTratamientosDto,
  CreateMultiplesTratamientosResponseDto,
  TurnoTratamiento,
} from './dto/create-tratamiento.dto';
import { UpdateTratamientoDto } from './dto/update-tratamiento.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EstablecimientoGuard } from '../auth/establecimiento.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, EstablecimientoGuard, RolesGuard) // ✅ Orden correcto de guards
@ApiTags('Tratamientos')
@Controller('tratamientos')
export class TratamientosController {
  constructor(private readonly tratamientosService: TratamientosService) {}

  @Post('crear-tratamiento')
  @Roles('admin', 'veterinario', 'operario')
  @ApiOperation({ summary: 'Servicio para crear un tratamiento' })
  @ApiBody({ type: CreateTratamientoDto })
  async create(
    @Body() createTratamientoDto: CreateTratamientoDto,
    @Req() req: any,
  ) {
    console.log('🔍 DEBUG CREATE TRATAMIENTO:');
    console.log('  - req.id_establecimiento:', req.id_establecimiento);
    console.log('  - req.es_admin:', req.es_admin);
    console.log('  - createTratamientoDto:', createTratamientoDto);

    const data = {
      ...createTratamientoDto,
      // ✅ Priorizar el del DTO (admin elige), si no existe usar el del JWT
      id_establecimiento:
        createTratamientoDto.id_establecimiento || req.id_establecimiento,
    };

    console.log('  - data final:', data);
    return this.tratamientosService.create(data);
  }

  @Post('crear-multiples-tratamientos')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario'
  @ApiOperation({
    summary: 'Servicio para crear múltiples tratamientos a la vez',
    description:
      'Permite crear varios tratamientos en una sola operación. Útil para cargas masivas o configuraciones iniciales.',
  })
  @ApiBody({
    type: CreateMultiplesTratamientosDto,
    description: 'Array de tratamientos a crear',
    examples: {
      ejemplo_multiple: {
        summary: 'Ejemplo con 3 tratamientos',
        description:
          'Creación de tratamientos para diferentes enfermedades y turnos',
        value: {
          tratamientos: [
            {
              nombre: 'Antibiótico Amoxicilina',
              descripcion:
                'Tratamiento antibiótico para infecciones bacterianas',
              tipo_enfermedad: 'Diarrea bacteriana',
              turno: 'mañana',
              fecha_tratamiento: '2024-12-15',
            },
            {
              nombre: 'Suero Oral Rehidratante',
              descripcion:
                'Solución para rehidratación en casos de deshidratación',
              tipo_enfermedad: 'Deshidratación severa',
              turno: 'tarde',
              fecha_tratamiento: '2024-12-15',
            },
            {
              nombre: 'Expectorante Natural',
              descripcion:
                'Tratamiento natural para aliviar síntomas respiratorios',
              tipo_enfermedad: 'Problemas respiratorios',
              turno: 'mañana',
              fecha_tratamiento: '2024-12-15',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tratamientos creados exitosamente (puede ser parcial)',
    type: CreateMultiplesTratamientosResponseDto,
  })
  async createMultiples(
    @Body() createMultiplesTratamientosDto: CreateMultiplesTratamientosDto,
    @Req() req: any,
  ): Promise<CreateMultiplesTratamientosResponseDto> {
    return this.tratamientosService.createMultiples({
      ...createMultiplesTratamientosDto,
      id_establecimiento:
        createMultiplesTratamientosDto.id_establecimiento ||
        req.id_establecimiento,
      EstablecimientoGuard,
    });
  }
  @Get('/obtener-listado-tratamientos')
  @ApiOperation({
    summary:
      'Este servicio trae listado de todos los tratamientos con filtros opcionales',
  })
  @ApiQuery({
    name: 'id_establecimiento',
    required: false,
    type: Number,
    description: 'Filtrar por establecimiento (solo Admin)',
  })
  @ApiQuery({
    name: 'tipo_enfermedad',
    required: false,
    type: String,
    description:
      'Filtrar tratamientos por tipo de enfermedad (búsqueda parcial)',
    example: 'diarrea',
  })
  @ApiQuery({
    name: 'turno',
    required: false,
    enum: ['mañana', 'tarde'],
    description: 'Filtrar tratamientos por turno (mañana o tarde)',
  })
  async findAll(
    @Req() req: any,
    @Query('id_establecimiento') idEstablecimientoQuery?: string,
    @Query('tipo_enfermedad') tipoEnfermedad?: string,
    @Query('turno') turno?: string,
  ) {
    const establecimientoFiltro = idEstablecimientoQuery
      ? parseInt(idEstablecimientoQuery, 10)
      : null;

    console.log(
      '🔍 Controller Tratamientos - ID del usuario:',
      req.id_establecimiento,
      'Es Admin:',
      req.es_admin,
    );
    console.log('📥 Query Params recibidos:', {
      establecimiento: establecimientoFiltro,
      tipo_enfermedad: tipoEnfermedad,
      turno,
    });

    return this.tratamientosService.findAll(
      req.id_establecimiento,
      req.es_admin,
      establecimientoFiltro,
      tipoEnfermedad,
      turno as TurnoTratamiento,
    );
  }
  @Get('/obtener-tratamientos-por-enfermedad/:tipo_enfermedad')
  @ApiOperation({
    summary:
      'Obtiene todos los tratamientos para un tipo específico de enfermedad',
  })
  @ApiParam({
    name: 'tipo_enfermedad',
    type: String,
    description: 'Tipo de enfermedad (búsqueda parcial, ejemplo: diarrea)',
  })
  async findByTipoEnfermedad(
    @Param('tipo_enfermedad') tipoEnfermedad: string,
    @Req() req: any,
  ) {
    return this.tratamientosService.findByTipoEnfermedad(
      tipoEnfermedad,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/obtener-tratamientos-por-turno/:turno')
  @ApiOperation({
    summary: 'Obtiene todos los tratamientos para un turno específico',
  })
  @ApiParam({
    name: 'turno',
    enum: TurnoTratamiento,
    description: 'Turno del tratamiento (mañana o tarde)',
  })
  async findByTurno(@Param('turno') turno: TurnoTratamiento, @Req() req: any) {
    return this.tratamientosService.findByTurno(
      turno,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/obtener-tratamientos-por-enfermedad-y-turno/:tipo_enfermedad/:turno')
  @ApiOperation({
    summary: 'Obtiene tratamientos filtrados por tipo de enfermedad y turno',
  })
  @ApiParam({
    name: 'tipo_enfermedad',
    type: String,
    description: 'Tipo de enfermedad (búsqueda parcial)',
  })
  @ApiParam({
    name: 'turno',
    enum: TurnoTratamiento,
    description: 'Turno del tratamiento (mañana o tarde)',
  })
  async findByTipoEnfermedadYTurno(
    @Param('tipo_enfermedad') tipoEnfermedad: string,
    @Param('turno') turno: TurnoTratamiento,
    @Req() req: any,
  ) {
    return this.tratamientosService.findByTipoEnfermedadYTurno(
      tipoEnfermedad,
      turno,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Get('/get-tratamiento-by-id/:id_tratamiento')
  @ApiOperation({
    summary: 'Devuelve un tratamiento por id_tratamiento',
  })
  @ApiParam({
    name: 'id_tratamiento',
    description: 'Código único id del tratamiento',
  })
  async findOne(
    @Param('id_tratamiento') id_tratamiento: string,
    @Req() req: any,
  ) {
    return this.tratamientosService.findOne(
      +id_tratamiento,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Patch('/patch-tratamiento-by-id/:id_tratamiento')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'operario'
  @ApiOperation({
    summary: 'Servicio para actualizar un tratamiento por id_tratamiento',
  })
  @ApiParam({
    name: 'id_tratamiento',
    description: 'Código único id_tratamiento',
  })
  @ApiBody({ type: UpdateTratamientoDto })
  async update(
    @Param('id_tratamiento') id_tratamiento: string,
    @Body() updateTratamientoDto: UpdateTratamientoDto,
    @Req() req: any,
  ) {
    return this.tratamientosService.update(
      +id_tratamiento,
      updateTratamientoDto,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }

  @Delete('/delete-tratamiento-by-id/:id_tratamiento')
  @Roles('admin', 'veterinario', 'operario') // ✅ Agregar 'veterinario' y 'operario'
  @ApiOperation({
    summary: 'Proceso que elimina un tratamiento por id_tratamiento',
  })
  @ApiParam({
    name: 'id_tratamiento',
    description: 'Código único id_tratamiento.',
  })
  async remove(
    @Param('id_tratamiento') id_tratamiento: string,
    @Req() req: any,
  ) {
    return this.tratamientosService.remove(
      +id_tratamiento,
      req.id_establecimiento, // ✅ Inyectado por EstablecimientoGuard
      req.es_admin, // ✅ Inyectado por EstablecimientoGuard
    );
  }
}
