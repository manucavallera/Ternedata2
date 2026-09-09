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

@Entity('ternero_pesajes')
@Index(['id_ternero', 'fecha'], { unique: true })
@Index(['id_establecimiento'])
export class PesajeTerneroEntity {
  @PrimaryGeneratedColumn()
  id_pesaje: number;

  @Column({ type: 'int' })
  id_ternero: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  peso: number;

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
