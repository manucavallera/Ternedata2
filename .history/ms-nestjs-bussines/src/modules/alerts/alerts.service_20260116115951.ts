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

  // 1. Obtener configuración
  async getConfig(userId: number) {
    // ✅ CORRECCIÓN: Usamos findOne (Trae UNO) en vez de find (Trae LISTA)
    const config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      // Valores por defecto si no existe
      return { umbralMortalidad: 5, umbralMorbilidad: 10 };
    }
    return config;
  }

  // 2. Guardar o Actualizar configuración
  async saveConfig(userId: number, data: any) {
    // ✅ CORRECCIÓN: Usamos findOne aquí también
    let config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      // Si no existe, creamos uno nuevo
      config = this.alertsRepo.create({ userId, ...data });
    } else {
      // Si existe, actualizamos. .merge() necesita UN objeto, no una lista.
      this.alertsRepo.merge(config, data);
    }

    return await this.alertsRepo.save(config);
  }
}
