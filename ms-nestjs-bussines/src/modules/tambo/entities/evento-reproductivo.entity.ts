import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MadreEntity } from '../../madres/entities/madre.entity';

@Entity('eventos_reproductivos')
export class EventoReproductivoEntity {
  @PrimaryGeneratedColumn()
  id_evento: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'int' })
  id_madre: number;

  @ManyToOne(() => MadreEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_madre' })
  madre: MadreEntity;

  // parto, inseminacion, tacto, parche, secado, preparto, aborto, rechazo
  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'date' })
  fecha: string;

  // Solo tacto: 'preñada' o 'vacia'
  @Column({ type: 'varchar', length: 20, nullable: true })
  resultado: string | null;

  // Solo tacto con ecografía: días de gestación que dio el estudio
  @Column({ type: 'int', nullable: true })
  dias_gestacion: number | null;

  // Solo inseminación: toro o pajuela, texto libre
  @Column({ type: 'varchar', length: 100, nullable: true })
  toro: string | null;

  @Column({ type: 'text', nullable: true })
  observacion: string | null;

  @Column({ type: 'int', nullable: true })
  creado_por: number | null;

  @CreateDateColumn()
  creado_en: Date;
}
