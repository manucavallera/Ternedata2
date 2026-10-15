import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/entity/users.entity';

// La configuración de alertas es de cada usuario: solo la ve y la cambia el propio usuario
// (o un super_admin).
function exigirPropio(req: any, userId: number): void {
  if (req.user?.userId !== userId && req.user?.rol !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenException('Solo podés ver o cambiar tus propias alertas');
  }
}

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
  async getConfig(@Param('userId', ParseIntPipe) userId: number, @Req() req: any) {
    exigirPropio(req, userId);
    return this.alertsService.getConfig(userId);
  }

  @Post(':userId')
  async saveConfig(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    exigirPropio(req, userId);
    return this.alertsService.saveConfig(userId, body);
  }
}
