import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DietasService } from './dietas.service';
import { DietasController } from './dietas.controller';
import { RodeoDietaEntity } from './entities/rodeo-dieta.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RodeoDietaEntity,
      TerneroEntity,
      MadreEntity,
    ]),
  ],
  controllers: [DietasController],
  providers: [DietasService, JwtStrategy],
})
export class DietasModule {}
