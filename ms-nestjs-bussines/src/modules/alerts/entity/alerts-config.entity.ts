import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('alerts_config')
export class AlertsConfigEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userId: number; // 👈 Vinculamos la configuración al usuario (Admin)

  @Column({ type: 'float', default: 5.0 })
  umbralMortalidad: number; // Ej: 5.0%

  @Column({ type: 'float', default: 10.0 })
  umbralMorbilidad: number; // Ej: 10.0%

  // Opcionales para el futuro
  @Column({ default: true })
  whatsappEnabled: boolean;

  @Column({ default: true })
  emailEnabled: boolean;
}
