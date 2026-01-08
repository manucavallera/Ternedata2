import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('diarrea_terneros')
@Index(['id_establecimiento']) // ✅ ÍNDICE para optimizar queries
export class DiarreaTerneroEntity {
  @PrimaryGeneratedColumn()
  id_diarrea_ternero: number;

  @Column({ type: 'date', nullable: false })
  fecha_diarrea_ternero: Date;

  @Column({ nullable: false, type: 'varchar' })
  severidad: string;

  @Column({ nullable: false, type: 'int', default: 1 })
  numero_episodio: number; // Contador de episodios

  @Column({ nullable: true, type: 'text' })
  observaciones: string; // Observaciones médicas opcionales

  // ✅ MULTI-TENANCY: Campo de establecimiento
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @ManyToOne(() => TerneroEntity, (ternero) => ternero.diarreas, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'id_ternero' })
  ternero: TerneroEntity;

  // Métodos de conveniencia
  esPrimerEpisodio(): boolean {
    return this.numero_episodio === 1;
  }

  requiereAtencionUrgente(): boolean {
    return this.severidad === 'Severa' || this.severidad === 'Crítica';
  }
}
