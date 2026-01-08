import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserEntity, UserRole } from './entity/users.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Agregar RolesGuard
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===== RUTAS SOLO PARA ADMIN =====

  @Post()
  @Roles(UserRole.ADMIN) // Solo admin puede crear usuarios
  @ApiOperation({ summary: 'Crear nuevo usuario (solo admin)' })
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN) // Solo admin puede ver todos los usuarios
  @ApiOperation({ summary: 'Obtener todos los usuarios (solo admin)' })
  async findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  @Get('stats')
  @Roles(UserRole.ADMIN) // Solo admin puede ver estadísticas
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios (solo admin)' })
  async getStats() {
    return await this.usersService.getStats();
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Solo admin puede eliminar usuarios
  @ApiOperation({ summary: 'Desactivar usuario (solo admin)' })
  async remove(@Param('id') id: number) {
    return await this.usersService.remove(id);
  }

  @Put(':id/toggle-status')
  @Roles(UserRole.ADMIN) // Solo admin puede cambiar estado
  @ApiOperation({ summary: 'Activar/Desactivar usuario (solo admin)' })
  async toggleStatus(@Param('id') id: number) {
    return await this.usersService.toggleStatus(id);
  }

  @Put(':id/change-role')
  @Roles(UserRole.ADMIN) // Solo admin puede cambiar roles
  @ApiOperation({ summary: 'Cambiar rol de usuario (solo admin)' })
  async changeRole(@Param('id') id: string, @Body('rol') rol: UserRole) {
    return await this.usersService.changeRole(+id, rol);
  }

  // ===== RUTAS PARA TODOS LOS USUARIOS AUTENTICADOS =====

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@Request() req) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO) // Admin y veterinarios
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  async findByRole(@Param('role') role: UserRole) {
    return await this.usersService.findByRole(role);
  }

  // ===== RUTAS CON LÓGICA CONDICIONAL =====

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id') id: number, @Request() req): Promise<UserEntity> {
    // Si no es admin, solo puede ver su propio perfil
    if (req.user.rol !== UserRole.ADMIN && req.user.userId !== id) {
      throw new HttpException(
        'No tienes permisos para ver este usuario',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ): Promise<UserEntity> {
    // Si no es admin, solo puede actualizar su propio perfil
    if (req.user.rol !== UserRole.ADMIN && req.user.userId !== id) {
      throw new HttpException(
        'No tienes permisos para actualizar este usuario',
        HttpStatus.FORBIDDEN,
      );
    }

    // Si no es admin, no puede cambiar su propio rol
    if (req.user.rol !== UserRole.ADMIN && updateUserDto.rol) {
      throw new HttpException(
        'No tienes permisos para cambiar tu rol',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.usersService.update(id, updateUserDto);
  }
}
