import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { MadresService } from './madres.service';
import { CreateMadreDto } from './dto/create-madre.dto';
import { UpdateMadreDto } from './dto/update-madre.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
@ApiTags('Madres-De-Terneros')
@Controller('madres')
export class MadresController {
  constructor(private readonly madresService: MadresService) {}

  @Post('crear-madre')
  @ApiOperation({
    summary:
      'servicio para crear una madre',
  })
  @ApiBody({ type: CreateMadreDto })
  async create(@Body() createMadreDto: CreateMadreDto) {
    return this.madresService.create(createMadreDto);
  }

  @Get('/obtener-listado-madres')
  @ApiOperation({
    summary:
      'Este servicio trae listado de todas las madres',
  })
  async findAll() {
    return this.madresService.findAll();
  }

  @Get('/get-madre-by-id/:id_madre')
  @ApiOperation({ 
    summary: 'Devuelve una madre por id_madre' 
  })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id de la madre',
  })
  async findOne(@Param('id_madre') id_madre: string) {
    return this.madresService.findOne(+id_madre);
  }

  @Patch('/patch-madre-by-id/:id_madre')
  @ApiOperation({
    summary:
      'servicio para actualizar una madre por id_madre',
  })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id_madre',
  })
  @ApiBody({ type: UpdateMadreDto })
  async update(@Param('id_madre') id_madre: string, @Body() updateMadreDto: UpdateMadreDto) {
    return this.madresService.update(+id_madre, updateMadreDto);
  }

  @Delete('/delete-madre-by-id/:id_madre')
  @ApiOperation({
    summary:
      'Proceso que elimina a madre por id_madre',
  })
  @ApiParam({
    name: 'id_madre',
    description: 'Código único id_madre.',
  })
  async remove(@Param('id_madre') id_madre: string) {
    return this.madresService.remove(+id_madre);
  }
}
