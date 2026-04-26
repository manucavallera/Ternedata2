import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsConfigEntity } from './entity/alerts-config.entity';
import { UsersService } from '../users/users.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertsConfigEntity)
    private readonly alertsRepo: Repository<AlertsConfigEntity>,
    private readonly usersService: UsersService,
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

  // 3. Verificar umbrales y enviar alerta por email si corresponde
  async verificarYNotificar(
    userId: number,
    establecimientoId: number,
    mortalidad: number,
    morbilidad: number,
  ): Promise<{ alertaEnviada: boolean; motivo?: string }> {
    const config = await this.getConfig(userId);

    if (!config.emailEnabled) {
      return { alertaEnviada: false, motivo: 'email deshabilitado' };
    }

    const superaMortalidad = mortalidad >= config.umbralMortalidad;
    const superaMorbilidad = morbilidad >= config.umbralMorbilidad;

    if (!superaMortalidad && !superaMorbilidad) {
      return { alertaEnviada: false, motivo: 'umbrales no superados' };
    }

    // Cooldown de 24h para no spamear
    if (config.lastAlertSent) {
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (config.lastAlertSent > hace24h) {
        return { alertaEnviada: false, motivo: 'alerta enviada hace menos de 24h' };
      }
    }

    const user = await this.usersService.findOne(userId);
    if (!user?.email) {
      return { alertaEnviada: false, motivo: 'email del usuario no encontrado' };
    }

    const alertas: string[] = [];
    if (superaMortalidad) {
      alertas.push(`🔴 Mortalidad: <strong>${mortalidad}%</strong> (umbral: ${config.umbralMortalidad}%)`);
    }
    if (superaMorbilidad) {
      alertas.push(`🟡 Morbilidad: <strong>${morbilidad}%</strong> (umbral: ${config.umbralMorbilidad}%)`);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    });

    try {
      await transporter.sendMail({
        from: `"Ternedata Alertas 🐮" <${process.env.MAIL_USER}>`,
        to: user.email,
        subject: '⚠️ Alerta sanitaria - Ternedata',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #dc2626;">⚠️ Alerta Sanitaria del Rodeo</h2>
            <p>Hola <strong>${user.name}</strong>, se superaron los umbrales configurados:</p>
            <ul style="padding-left: 20px; line-height: 1.8;">
              ${alertas.map((a) => `<li>${a}</li>`).join('')}
            </ul>
            <p style="margin-top: 16px;">Revisá el estado de tu rodeo en <a href="${process.env.FRONTEND_URL}">Ternedata</a>.</p>
            <p style="font-size: 12px; color: #888;">Este email se envía máximo una vez cada 24hs.</p>
          </div>
        `,
      });

      await this.alertsRepo.update(
        { userId },
        { lastAlertSent: new Date() },
      );

      return { alertaEnviada: true };
    } catch (error) {
      console.error('❌ Error enviando alerta:', error);
      return { alertaEnviada: false, motivo: 'error al enviar email' };
    }
  }
}
