import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SustitutoService } from './sustituto.service';
import { SustitutoController } from './sustituto.controller';
import { CalculoSustitutoEntity } from './entities/calculo-sustituto.entity';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([CalculoSustitutoEntity])],
  controllers: [SustitutoController],
  providers: [SustitutoService, JwtStrategy],
})
export class SustitutoModule {}
