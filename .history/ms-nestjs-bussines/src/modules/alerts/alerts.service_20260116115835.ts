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

  async getConfig(userId: number) {
    // 👇 OJO AQUÍ: Usa 'findOne', NO 'find'
    const config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      return { umbralMortalidad: 5, umbralMorbilidad: 10 };
    }
    return config;
  }

  async saveConfig(userId: number, data: any) {
    // 👇 OJO AQUÍ TAMBIÉN: 'findOne'
    let config = await this.alertsRepo.findOne({ where: { userId } });

    if (!config) {
      // Si no existe, creamos uno nuevo (esto devuelve un objeto único)
      config = this.alertsRepo.create({ userId, ...data });
    } else {
      // Si existe, actualizamos. .merge espera (Objeto, Datos)
      // Si le pasas un Array aquí, explota con tu error TS2740.
      this.alertsRepo.merge(config, data);
    }

    return await this.alertsRepo.save(config);
  }
}
