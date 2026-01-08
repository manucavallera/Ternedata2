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
import { Establecimiento } from '../../establecimientos/entities/establecimiento.entity'; // ⬅️ CORREGIDO
import { TerneroEntity } from '../../terneros/entities/ternero.entity'; // ⬅️ CORREGIDO

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
  @ManyToOne(() => Establecimiento, { eager: false }) // ⬅️ CORREGIDO
  @JoinColumn({ name: 'id_establecimiento' })
  establecimiento: Establecimiento; // ⬅️ CORREGIDO

  @OneToMany(() => TerneroEntity, (ternero) => ternero.rodeo) // ⬅️ CORREGIDO
  terneros: TerneroEntity[]; // ⬅️ CORREGIDO
}
