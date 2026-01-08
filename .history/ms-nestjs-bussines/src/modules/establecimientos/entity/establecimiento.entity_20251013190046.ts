import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('establecimientos')
export class Establecimiento {
  @PrimaryGeneratedColumn()
  id_establecimiento: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  ubicacion: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @Column({ type: 'varchar', length: 20, default: 'activo' })
  estado: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @UpdateDateColumn()
  fecha_actualizacion: Date;
}
