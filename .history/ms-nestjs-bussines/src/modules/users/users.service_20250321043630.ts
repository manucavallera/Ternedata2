import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/user.dto';
import { UserEntity } from './entity/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly usersRepository: Repository<UserEntity>,
      ) {}
    
    
    
      // Obtener todos los usuarios
      async findAll(): Promise<UserEntity[]> {
        return this.usersRepository.find();
      }
    
      // Obtener un usuario por ID
      async findOne(id: number): Promise<UserEntity> {
        const user = await this.usersRepository.findOne({where:{
            id:id
        }});
        if (!user) {
          if (!user) {
            throw new HttpException('NOT_FOUND', HttpStatus.NOT_FOUND, {
            cause: new Error('Usuario po ID no encontrado'),
            })
          }
        }
        return user;
      }
    
      // Actualizar un usuario por ID
      async update(id: number, updateUserDto: CreateUserDto): Promise<UserEntity> {
        const {name,email,password} = updateUserDto;
    
        const saltOrRounds = 10;
        const hash = await bcrypt.hash(password, saltOrRounds);
    
        const nuevoUsuario = {
          name:name,
          email:email,
          password:hash
        }
        const user = await this.usersRepository.preload({
          id: +id,
          ...nuevoUsuario,
        });
    
        if (!user) {
          if (!user) {
            throw new HttpException('NOT_FOUND', HttpStatus.NOT_FOUND, {
            cause: new Error('Usuario po ID no encontrado'),
            })
          }
        }
    
        return this.usersRepository.save(user);
      }
    
      // Eliminar un usuario por ID
      async remove(id: number): Promise<void> {
        const user = await this.findOne(id); // Usa findOne para verificar si existe
        if (!user) {
          throw new HttpException('NOT_FOUND', HttpStatus.NOT_FOUND, {
          cause: new Error('Usuario po ID no encontrado'),
          })
        }
        await this.usersRepository.remove(user);
      }
}
