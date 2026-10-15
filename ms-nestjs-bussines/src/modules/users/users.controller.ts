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
  ParseIntPipe, // ⬅️ Agregá esto
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
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const esSuperAdmin = req.user.rol === UserRole.SUPER_ADMIN;
    if (createUserDto.rol === UserRole.SUPER_ADMIN && !esSuperAdmin) {
      throw new HttpException('Solo un super_admin puede asignar ese rol', HttpStatus.FORBIDDEN);
    }
    // Un usuario sin campo no lo podría administrar nadie más que un super_admin
    if (!esSuperAdmin && !createUserDto.id_establecimiento) {
      throw new HttpException('Indicá el establecimiento del usuario', HttpStatus.BAD_REQUEST);
    }
    if (createUserDto.id_establecimiento) {
      await this.usersService.exigirAdminDeCampo(req.user, createUserDto.id_establecimiento);
    }
    return await this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los usuarios (solo admin)' })
  async findAll(@Request() req) {
    return await this.usersService.findAllEn(await this.usersService.camposAdministrados(req.user));
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios (solo admin)' })
  async getStats(@Request() req) {
    return await this.usersService.getStatsEn(await this.usersService.camposAdministrados(req.user));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario (solo admin)' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.usersService.verificarPertenenciaAdmin(req.user, id);
    return await this.usersService.remove(id);
  }

  @Put(':id/toggle-status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Activar/Desactivar usuario (solo admin)' })
  async toggleStatus(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.usersService.verificarPertenenciaAdmin(req.user, id);
    return await this.usersService.toggleStatus(id);
  }

  @Put(':id/change-role')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar rol de usuario (solo admin)' })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('rol') rol: UserRole,
    @Request() req,
  ) {
    if (!Object.values(UserRole).includes(rol)) {
      throw new HttpException('Rol inválido', HttpStatus.BAD_REQUEST);
    }
    if (rol === UserRole.SUPER_ADMIN && req.user.rol !== UserRole.SUPER_ADMIN) {
      throw new HttpException('Solo un super_admin puede asignar ese rol', HttpStatus.FORBIDDEN);
    }
    await this.usersService.verificarPertenenciaAdmin(req.user, id);
    return await this.usersService.changeRole(id, rol);
  }

  @Get('profile/me')
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  async getProfile(@Request() req) {
    return await this.usersService.findOne(req.user.userId);
  }

  @Post('me/generar-token-bot')
  @ApiOperation({ summary: 'Generar código de vinculación para el bot de Telegram' })
  async generarTokenBot(@Request() req) {
    return await this.usersService.generarTokenBot(req.user.userId);
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.VETERINARIO)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  async findByRole(@Param('role') role: UserRole, @Request() req) {
    const campos = req.user.rol === UserRole.SUPER_ADMIN ? null : await this.usersService.camposDe(req.user);
    return await this.usersService.findByRoleEn(role, campos);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    // ⬅️ ParseIntPipe
    if (req.user.userId !== id) {
      await this.usersService.verificarPertenenciaAdmin(req.user, id);
    }
    return await this.usersService.findOne(id);
  }

  @Get(':id/establecimientos')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener establecimientos asignados al usuario' })
  async getEstablecimientos(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.userId !== id) {
      await this.usersService.verificarPertenenciaAdmin(req.user, id);
    }
    const asignados = await this.usersService.getEstablecimientos(id);
    const campos = await this.usersService.camposAdministrados(req.user);
    // Solo los campos que el actor administra: los demás no son asunto suyo
    return campos === null ? asignados : asignados.filter((e) => campos.includes(e));
  }

  @Put(':id/establecimientos')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sincronizar establecimientos asignados al usuario' })
  async syncEstablecimientos(
    @Param('id', ParseIntPipe) id: number,
    @Body('ids') ids: number[],
    @Request() req,
  ) {
    await this.usersService.verificarPertenenciaAdmin(req.user, id);
    const campos = await this.usersService.camposAdministrados(req.user);
    const idsInvalidos = campos === null ? [] : (ids || []).filter((estId) => !campos.includes(estId));
    if (idsInvalidos.length > 0) {
      throw new HttpException(
        `No tenés acceso a los establecimientos: ${idsInvalidos.join(', ')}`,
        HttpStatus.FORBIDDEN,
      );
    }
    // Solo se reemplazan las membresías en campos que el actor administra
    await this.usersService.syncEstablecimientos(id, ids || [], campos);
    return { ok: true };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id', ParseIntPipe) id: number, // ⬅️ ParseIntPipe
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const esSuperAdmin = req.user.rol === UserRole.SUPER_ADMIN;
    const propio = req.user.userId === id;

    // Editar a otro usuario exige administrar su campo
    if (!propio) {
      await this.usersService.verificarPertenenciaAdmin(req.user, id);
    }

    if (updateUserDto.rol !== undefined && !esSuperAdmin) {
      if (propio) {
        throw new HttpException('No podés cambiar tu propio rol', HttpStatus.FORBIDDEN);
      }
      if (updateUserDto.rol === UserRole.SUPER_ADMIN) {
        throw new HttpException('Solo un super_admin puede asignar ese rol', HttpStatus.FORBIDDEN);
      }
    }

    // El campo principal solo puede pasar a uno que el actor administre
    if (updateUserDto['id_establecimiento'] !== undefined && !esSuperAdmin) {
      if (propio && req.user.rol !== UserRole.ADMIN) {
        delete updateUserDto['id_establecimiento'];
      } else if (updateUserDto['id_establecimiento'] !== null) {
        await this.usersService.exigirAdminDeCampo(req.user, updateUserDto['id_establecimiento']);
      }
    }

    return await this.usersService.update(id, updateUserDto);
  }
}
