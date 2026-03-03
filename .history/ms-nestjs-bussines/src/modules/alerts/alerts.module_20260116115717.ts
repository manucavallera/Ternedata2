import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsConfigEntity } from './entity/alerts-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AlertsConfigEntity])],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService], // 👈 Exportamos para usarlo cuando registremos muertes
})
export class AlertsModule {}
