import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get(':userId')
  async getConfig(@Param('userId', ParseIntPipe) userId: number) {
    return this.alertsService.getConfig(userId);
  }

  @Post(':userId')
  async saveConfig(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: any,
  ) {
    return this.alertsService.saveConfig(userId, body);
  }
}
