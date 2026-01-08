import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitacionesService } from './invitaciones.service';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionEntity } from './entities/invitacion.entity';
import { UserEstablecimientoEntity } from '../users/entity/user-establecimiento.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvitacionEntity, UserEstablecimientoEntity]),
    UsersModule, // Importante para poder usar el usersService
  ],
  controllers: [InvitacionesController],
  providers: [InvitacionesService],
})
export class InvitacionesModule {}
