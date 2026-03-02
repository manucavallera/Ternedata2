// ms-nestjs-security/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // 👈 1. IMPORTANTE: Agregado para arreglar el error de dependencias
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserEntity } from './entity/users.entity';
import { UserEstablecimientoEntity } from './entity/user-establecimiento.entity';
import { Establecimiento } from './entity/establecimiento.entity'; // 👈 2. Mantenemos la entidad espejo

@Module({
  imports: [
    // 👇 3. Agregamos ConfigModule para que JwtStrategy/ConfigService funcionen aquí
    ConfigModule,

    TypeOrmModule.forFeature([
      UserEntity,
      UserEstablecimientoEntity,
      Establecimiento, // 👈 4. Asegúrate de que siga aquí
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
