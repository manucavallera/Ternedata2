import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsConfigEntity } from './entity/alerts-config.entity';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertsConfigEntity)
    private readonly alertsRepo: Repository<AlertsConfigEntity>,
  ) {}

  // 1. Obtener configuración (o devolver valores por defecto)
  async getConfig(userId: number) {
    const config = await this.alertsRepo.findOne({ where: { userId } });
    if (!config) {
      return { umbralMortalidad: 5, umbralMorbilidad: 10 }; // Valores default
    }
    return config;
  }

  // 2. Guardar o Actualizar configuración
  async saveConfig(userId: number, data: any) {
    let config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      config = this.alertsRepo.create({ userId, ...data });
    } else {
      this.alertsRepo.merge(config, data);
    }

    return await this.alertsRepo.save(config);
  }
}
