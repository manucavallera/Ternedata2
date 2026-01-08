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
import { Roles } from '../auth/roles.decorator
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
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los usuarios (solo admin)' })
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios (solo admin)' })
  async getStats() {
    return await this.usersService.getStats();
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@Request() req) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  async findByRole(@Param('role') role: UserRole) {
    return await this.usersService.findByRole(role);
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
}
