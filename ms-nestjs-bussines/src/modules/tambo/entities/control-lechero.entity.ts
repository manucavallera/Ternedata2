import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MadreEntity } from '../../madres/entities/madre.entity';

// Postgres devuelve NUMERIC como texto: se pasa a número al leer.
const litros = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v == null ? null : Number(v)),
};

@Entity('controles_lecheros')
@Unique('uq_control_madre_fecha', ['id_madre', 'fecha'])
export class ControlLecheroEntity {
  @PrimaryGeneratedColumn()
  id_control: number;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'int' })
  id_madre: number;

  @ManyToOne(() => MadreEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_madre' })
  madre: MadreEntity;

  @Column({ type: 'date' })
  fecha: string;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: litros,
  })
  litros_manana: number | null;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: litros,
  })
  litros_tarde: number | null;

  @Column({ type: 'int', nullable: true })
  creado_por: number | null;

  @CreateDateColumn()
  creado_en: Date;
}
