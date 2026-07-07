import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('rodeo_dietas')
@Index(['id_rodeo'])
@Index(['id_establecimiento'])
export class RodeoDietaEntity {
  @PrimaryGeneratedColumn()
  id_dieta: number;

  @Column({ type: 'int' })
  id_rodeo: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  // 'nota' (texto libre) | 'formula' (kg por animal)
  @Column({ type: 'varchar', length: 20 })
  modo: string;

  @Column({ type: 'text', nullable: true })
  nota: string;

  @Column({ type: 'numeric', nullable: true })
  kg_por_animal: number;

  @Column({ type: 'varchar', nullable: true })
  nombre: string;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;
}
