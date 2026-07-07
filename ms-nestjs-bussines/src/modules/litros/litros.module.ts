import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LitrosService } from './litros.service';
import { LitrosController } from './litros.controller';
import { RegistroLitrosEntity } from './entities/registro-litros.entity';
import { MadreEntity } from '../madres/entities/madre.entity';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroLitrosEntity, MadreEntity]),
  ],
  controllers: [LitrosController],
  providers: [LitrosService, JwtStrategy],
})
export class LitrosModule {}
