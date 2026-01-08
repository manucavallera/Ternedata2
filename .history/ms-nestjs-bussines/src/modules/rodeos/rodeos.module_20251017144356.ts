import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RodeosController } from './rodeos.controller';
import { RodeosService } from './rodeos.service';
import { Rodeos } from './entities/rodeos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rodeos])],
  controllers: [RodeosController],
  providers: [RodeosService],
  exports: [RodeosService],
})
export class RodeosModule {}
