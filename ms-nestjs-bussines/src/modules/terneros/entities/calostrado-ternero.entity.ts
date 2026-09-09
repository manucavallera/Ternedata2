import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TerneroEntity } from './ternero.entity';

@Entity('ternero_calostrados')
@Index(['id_ternero', 'fecha_hora'])
@Index(['id_establecimiento'])
export class CalostradoTerneroEntity {
  @PrimaryGeneratedColumn()
  id_calostrado: number;

  @Column({ type: 'int' })
  id_ternero: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'timestamp' })
  fecha_hora: Date;

  @Column({ type: 'varchar', length: 20 })
  metodo: string;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  litros: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  grado_brix: number;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'int', nullable: true })
  creado_por: number;

  @ManyToOne(() => TerneroEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_ternero' })
  ternero: TerneroEntity;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
