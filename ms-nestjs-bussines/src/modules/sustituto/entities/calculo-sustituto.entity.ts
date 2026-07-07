import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('calculo_sustituto')
@Index(['id_establecimiento'])
export class CalculoSustitutoEntity {
  @PrimaryGeneratedColumn()
  id_calculo: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'int', default: 1 })
  numero_terneros: number;

  @Column({ type: 'numeric', default: 0 })
  litros_por_ternero: number;

  @Column({ type: 'numeric', default: 0 })
  tomas_manana: number;

  @Column({ type: 'numeric', default: 0 })
  tomas_tarde: number;

  // Concentración del preparado: kg de sustituto por litro (12,5% = 0,125 kg/L)
  @Column({ type: 'numeric', default: 0.125 })
  concentracion: number;

  // Precio del sustituto en dólares por Kg
  @Column({ type: 'numeric', default: 0 })
  precio_sustituto_usd: number;

  // Precio de la leche real en pesos por litro
  @Column({ type: 'numeric', default: 0 })
  precio_leche: number;

  // Cotización del dólar en pesos (cargada a mano)
  @Column({ type: 'numeric', default: 0 })
  cotizacion_dolar: number;

  @Column({ type: 'varchar', nullable: true })
  observaciones: string;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
