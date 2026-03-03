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
  async getConfig(userId: number): Promise<AlertsConfigEntity> {
    const config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      // 🛠️ CORRECCIÓN: Usamos .create() para devolver una Entidad Real
      // (Si devuelves un objeto simple { ... }, TypeScript se queja porque le faltan propiedades)
      return this.alertsRepo.create({
        userId,
        umbralMortalidad: 5.0,
        umbralMorbilidad: 10.0,
        whatsappEnabled: true,
        emailEnabled: true,
      });
    }
    return config;
  }

  // 2. Guardar o Actualizar configuración
  async saveConfig(userId: number, data: Partial<AlertsConfigEntity>) {
    let config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      // Crear nueva instancia
      config = this.alertsRepo.create({ userId, ...data });
    } else {
      // Actualizar existente
      this.alertsRepo.merge(config, data);
    }

    return await this.alertsRepo.save(config);
  }
}
