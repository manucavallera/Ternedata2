import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from './entity/users.entity';
import { CreateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiBearerAuth() 
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}
    
  // Obtener todos los usuarios

  @Get()
  async findAll(): Promise<UserEntity[]> {
    return this.usersService.findAll();
  }

  // Obtener un usuario por ID
  
  @Get(':id')
  async findOne(@Param('id') id: number): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  // Actualizar un usuario por ID
 
  @Put(':id')
  async update(@Param('id') id: number, @Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.update(id, createUserDto);
  }

  // Eliminar un usuario por ID
  
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<void> {
    return this.usersService.remove(id);
  }
}
