// ms-nestjs-security/src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './entity/users.entity';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear nuevo usuario (solo admin)' })
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener usuarios (Filtrado según quién lo pide)' })
  async findAll(@Request() req) {
    if (!req.user) {
      throw new HttpException(
        'Usuario no identificado',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return await this.usersService.findAll(req.user);
  }

  // 👇 MODIFICADO: Ahora recibe @Request() para filtrar estadísticas
  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener estadísticas filtradas por establecimiento',
  })
  async getStats(@Request() req) {
    // Le pasamos el usuario al servicio
    return await this.usersService.getStats(req.user);
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@Request() req) {
    // 👇 DEBUG: Ver qué llega realmente (míralo en la consola negra del backend)
    console.log('👤 Profile Request User:', req.user);

    // 🛡️ CORRECCIÓN: Buscamos 'id', 'userId' o 'sub' para ir a lo seguro
    const idUsuario = req.user.id || req.user.userId || req.user.sub;

    if (!idUsuario) {
      throw new HttpException(
        'ID de usuario no encontrado en el token',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.usersService.findOne(idUsuario);
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  async findByRole(@Param('role') role: UserRole) {
    return await this.usersService.findByRole(role);
  }

  @Get('by-establecimiento/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener usuarios de un establecimiento (solo admin)',
  })
  async findByEstablecimiento(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findByEstablecimiento(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.rol !== UserRole.ADMIN && req.user.userId !== id) {
      throw new HttpException(
        'No tienes permisos para ver este usuario',
        HttpStatus.FORBIDDEN,
      );
    }
    return await this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    if (req.user.rol !== UserRole.ADMIN && req.user.userId !== id) {
      throw new HttpException(
        'No tienes permisos para actualizar este usuario',
        HttpStatus.FORBIDDEN,
      );
    }

    if (req.user.rol !== UserRole.ADMIN && updateUserDto.rol) {
      throw new HttpException(
        'No tienes permisos para cambiar tu rol',
        HttpStatus.FORBIDDEN,
      );
    }

    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario (solo admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.remove(id);
  }

  @Put(':id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar/Desactivar usuario (solo admin)' })
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.toggleStatus(id);
  }

  @Put(':id/change-role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar rol de usuario (solo admin)' })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('rol') rol: UserRole,
  ) {
    return await this.usersService.changeRole(id, rol);
  }

  // 👇 AGREGAR ESTO EN users.controller.ts
  @Post('assign-establishment')
  async assignEstablecimiento(
    @Body() body: { userId: number; establecimientoId: number },
  ) {
    return this.usersService.assignEstablecimiento(
      body.userId,
      body.establecimientoId,
    );
  }
}
