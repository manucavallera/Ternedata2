import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('check')
  async checkUmbrales(
    @Req() req: any,
    @Body() body: { establecimientoId: number; mortalidad: number; morbilidad: number },
  ) {
    return this.alertsService.verificarYNotificar(
      req.user.userId,
      body.establecimientoId,
      body.mortalidad,
      body.morbilidad,
    );
  }

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
