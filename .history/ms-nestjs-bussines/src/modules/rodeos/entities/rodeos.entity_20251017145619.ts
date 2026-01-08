import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity';
import { Terneros } from '../../terneros/entities/ternero.entity';

@Entity('rodeos')
export class Rodeos {
  @PrimaryGeneratedColumn()
  id_rodeo: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tipo: string; // 'cria', 'destete', 'engorde', 'reproduccion', 'otro'

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha_creacion: Date;

  @Column({ type: 'int' })
  id_establecimiento: number;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string; // 'activo', 'inactivo'

  @UpdateDateColumn({ type: 'timestamp' })
  fecha_actualizacion: Date;

  // Relaciones
  @ManyToOne(() => Establecimientos, { eager: false })
  @JoinColumn({ name: 'id_establecimiento' })
  establecimiento: Establecimientos;

  @OneToMany(() => Terneros, (ternero) => ternero.rodeo)
  terneros: Terneros[];
}
