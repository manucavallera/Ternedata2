import { TerneroTratamientoEntity } from 'src/modules/terneros-tratamientos/entities/terneros-tratamiento.entity';
import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum TurnoTratamiento {
  MAÑANA = 'mañana',
  TARDE = 'tarde',
}

@Entity('tratamientos')
export class TratamientoEntity {
  @PrimaryGeneratedColumn()
  id_tratamiento: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  descripcion: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tipo_enfermedad: string;

  @Column({
    type: 'enum',
    enum: TurnoTratamiento,
    nullable: false,
    default: TurnoTratamiento.MAÑANA,
  })
  turno: TurnoTratamiento;

  @Column({ type: 'date', nullable: false })
  fecha_tratamiento: Date;

  // NUEVA RELACIÓN DIRECTA CON TERNEROS
  @ManyToOne(() => TerneroEntity, (ternero) => ternero.tratamientos, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'id_ternero' })
  ternero: TerneroEntity;

  // Mantener la relación existente para compatibilidad
  @OneToMany(
    () => TerneroTratamientoEntity,
    (terneroTratamiento) => terneroTratamiento.tratamiento,
  )
  ternerosTratamientos: TerneroTratamientoEntity[];
}
