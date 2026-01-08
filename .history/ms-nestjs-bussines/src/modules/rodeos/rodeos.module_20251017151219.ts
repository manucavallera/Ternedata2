import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RodeosController } from './rodeos.controller';
import { RodeosService } from './rodeos.service';
import { Rodeos } from './entity/rodeos.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rodeos]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [RodeosController],
  providers: [RodeosService],
  exports: [RodeosService],
})
export class RodeosModule {}
