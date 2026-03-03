import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entity/users.entity';
// 👇 1. IMPORTA EL ARCHIVO QUE ACABAMOS DE CREAR
import { UserEstablecimientoEntity } from './entity/user-establecimiento.entity';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    // 👇 2. AGRÉGALO AQUÍ
    TypeOrmModule.forFeature([UserEntity, UserEstablecimientoEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
})
export class UsersModule {}
