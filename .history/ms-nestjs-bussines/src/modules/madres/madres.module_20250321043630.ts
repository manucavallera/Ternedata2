import { Module } from '@nestjs/common';
import { MadresService } from './madres.service';
import { MadresController } from './madres.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MadreEntity } from './entities/madre.entity';
import { JwtStrategy } from '../auth/jwt.strategy';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { EventoEntity } from '../eventos/entities/evento.entity';
import { PadreEntity } from '../padres/entities/padre.entity';


@Module({
  imports:[TypeOrmModule.forFeature([MadreEntity,TerneroEntity,EventoEntity,PadreEntity])],
  controllers: [MadresController],
  providers: [MadresService,JwtStrategy],
})
export class MadresModule {}
