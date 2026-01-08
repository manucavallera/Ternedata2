import { Module } from '@nestjs/common';
import { DiarreaTernerosService } from './diarrea-terneros.service';
import { DiarreaTernerosController } from './diarrea-terneros.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiarreaTerneroEntity } from './entities/diarrea-ternero.entity';
import { TerneroEntity } from '../terneros/entities/ternero.entity';
import { JwtStrategy } from '../auth/jwt.strategy';

@Module({
    imports:[TypeOrmModule.forFeature([DiarreaTerneroEntity,TerneroEntity])],
  controllers: [DiarreaTernerosController],
  providers: [DiarreaTernerosService,JwtStrategy],
})
export class DiarreaTernerosModule {}
