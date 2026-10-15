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
import { ChangeUserRoleDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';
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
    if (createUserDto.rol === UserRole.SUPER_ADMIN) {
      throw new HttpException('El rol super_admin no se puede asignar desde este endpoint', HttpStatus.FORBIDDEN);
    }
    // Un usuario sin campo no lo podría administrar nadie más que un super_admin
    if (req.user.rol !== UserRole.SUPER_ADMIN && !createUserDto.id_establecimiento) {
      throw new HttpException('Indicá el establecimiento del usuario', HttpStatus.BAD_REQUEST);
    }
    if (createUserDto.id_establecimiento) {
      await this.usersService.verificarEstablecimientos(req.user, [createUserDto.id_establecimiento]);
    }
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

  @Get('admin/global')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener usuarios globales (solo super_admin)' })
  async findAllGlobal() {
    return await this.usersService.findAllGlobal();
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
  async findByRole(@Param('role') role: UserRole, @Request() req) {
    const campos = req.user.rol === UserRole.SUPER_ADMIN ? null : await this.usersService.camposDe(req.user);
    return await this.usersService.findByRole(role, campos);
  }

  @Get('by-establecimiento/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener usuarios de un establecimiento (solo admin)',
  })
  async findByEstablecimiento(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.usersService.verificarEstablecimientos(req.user, [id]);
    return await this.usersService.findByEstablecimiento(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.rol === UserRole.SUPER_ADMIN || req.user.userId === id) {
      return await this.usersService.findOne(id);
    }
    // Ver a otro usuario exige administrar su campo
    await this.usersService.verificarAlcance(req.user, id);
    const user = await this.usersService.findOne(id);
    // Las membresías en campos ajenos no son asunto del actor
    const campos = await this.usersService.camposAdministrados(req.user);
    user.userEstablecimientos = (user.userEstablecimientos || []).filter((ue) =>
      campos.includes(ue.establecimientoId),
    );
    return user;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    if (req.user.rol !== UserRole.ADMIN && req.user.rol !== UserRole.SUPER_ADMIN && req.user.userId !== id) {
      throw new HttpException(
        'No tienes permisos para actualizar este usuario',
        HttpStatus.FORBIDDEN,
      );
    }

    if (req.user.rol !== UserRole.ADMIN && req.user.rol !== UserRole.SUPER_ADMIN && updateUserDto.rol) {
      throw new HttpException(
        'No tienes permisos para cambiar tu rol',
        HttpStatus.FORBIDDEN,
      );
    }

    if (req.user.rol !== UserRole.SUPER_ADMIN) {
      if (updateUserDto.rol === UserRole.SUPER_ADMIN) {
        throw new HttpException('El rol super_admin no se puede asignar desde este endpoint', HttpStatus.FORBIDDEN);
      }
      await this.usersService.verificarAlcance(req.user, id);
      if (updateUserDto.id_establecimiento) {
        if (req.user.userId === id) {
          await this.usersService.verificarPertenencia(req.user, updateUserDto.id_establecimiento);
        } else {
          await this.usersService.verificarEstablecimientos(req.user, [updateUserDto.id_establecimiento]);
        }
      }
    }

    return await this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar usuario (solo admin)' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    await this.usersService.verificarAlcance(req.user, id);
    return await this.usersService.remove(id);
  }

  @Put(':id/toggle-status')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activar/Desactivar usuario (solo super_admin)' })
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.toggleStatus(id);
  }

  @Put(':id/change-role')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cambiar rol de usuario (solo super_admin)' })
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ChangeUserRoleDto,
  ) {
    return await this.usersService.changeRole(id, body.rol);
  }

  @Post('assign-establishment')
  @Roles(UserRole.ADMIN)
  async assignEstablecimiento(
    @Body() body: { userId: number; establecimientoId: number },
    @Request() req,
  ) {
    await this.usersService.verificarAlcance(req.user, body.userId);
    await this.usersService.verificarEstablecimientos(req.user, [body.establecimientoId]);
    return this.usersService.assignEstablecimiento(
      body.userId,
      body.establecimientoId,
    );
  }

  @Get(':id/establecimientos')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Obtener establecimientos asignados (solo super_admin)' })
  async getEstablecimientos(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.getEstablecimientos(id);
  }

  @Put(':id/establecimientos')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Sincronizar establecimientos asignados al usuario' })
  async syncEstablecimientos(
    @Param('id', ParseIntPipe) id: number,
    @Body('ids') ids: number[],
    @Request() req,
  ) {
    await this.usersService.verificarAlcance(req.user, id);
    await this.usersService.verificarEstablecimientos(req.user, ids || []);
    // Solo se reemplazan las membresías en campos que el actor administra
    const campos = req.user.rol === UserRole.SUPER_ADMIN ? null : await this.usersService.camposAdministrados(req.user);
    await this.usersService.syncEstablecimientos(id, ids || [], campos);
    return { ok: true };
  }
}
