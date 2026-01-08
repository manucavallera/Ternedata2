import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventoEntity } from './entities/evento.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { MadreEntity } from '../madres/entities/madre.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([EventoEntity, TerneroEntity,MadreEntity]),
  ],
  controllers: [EventosController],
  providers: [EventosService,JwtStrategy],
})
export class EventosModule {}
