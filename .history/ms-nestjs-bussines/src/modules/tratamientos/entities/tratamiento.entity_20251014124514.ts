// ms-nestjs-business/src/modules/tratamientos/entities/tratamiento.entity.ts
import { TerneroTratamientoEntity } from 'src/modules/terneros-tratamientos/entities/terneros-tratamiento.entity';
import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
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

  // 🆕 NUEVO CAMPO: Relación con establecimiento
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;

  // Relación directa con terneros
  @ManyToOne(() => TerneroEntity, (ternero) => ternero.tratamientos, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'id_ternero' })
  ternero: TerneroEntity;

  // Relación existente para compatibilidad
  @OneToMany(
    () => TerneroTratamientoEntity,
    (terneroTratamiento) => terneroTratamiento.tratamiento,
  )
  ternerosTratamientos: TerneroTratamientoEntity[];
}
