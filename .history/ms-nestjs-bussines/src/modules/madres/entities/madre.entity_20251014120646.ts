// ms-nestjs-business/src/modules/madres/entities/madre.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TerneroEntity } from '../../terneros/entities/ternero.entity';

@Entity('madres')
export class MadreEntity {
  @PrimaryGeneratedColumn()
  id_madre: number;

  @Column({ type: 'varchar', length: 50 })
  rp_madre: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  raza: string;

  @Column({ type: 'date', nullable: true })
  fecha_nacimiento: Date;

  @Column({ type: 'varchar', length: 20, default: 'activa' })
  estado: string; // activa, inactiva, vendida, muerta

  // 🆕 NUEVO CAMPO: Relación con establecimiento
  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;

  // Relación con terneros
  @OneToMany(() => TerneroEntity, (ternero) => ternero.madre)
  terneros: TerneroEntity[];
}
