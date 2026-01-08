// ms-nestjs-business/src/modules/madres/entities/madre.entity.ts
import { EventoEntity } from 'src/modules/eventos/entities/evento.entity';
import { TerneroEntity } from 'src/modules/terneros/entities/ternero.entity';
import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('madres')
export class MadreEntity {
  @PrimaryGeneratedColumn()
  id_madre: number;

  @Column({ nullable: false, type: 'varchar' })
  nombre: string;

  @Column({ nullable: false, type: 'integer' }) // ✅ O 'varchar' según tu BD
  rp_madre: number; // ✅ O string según tu BD

  @Column({ type: 'enum', enum: ['Seca', 'En Tambo'] })
  estado: string;

  @Column({ nullable: false, type: 'varchar' })
  observaciones: string;

  @Column({ type: 'date', nullable: false })
  fecha_nacimiento: Date;

  @Column({ type: 'int', nullable: true })
  id_establecimiento: number;

  @CreateDateColumn()
  creado_en: Date;

  @UpdateDateColumn()
  actualizado_en: Date;

  @OneToMany(() => TerneroEntity, (ternero) => ternero.madre, {
    onDelete: 'CASCADE',
  })
  terneros: TerneroEntity[];

  @ManyToMany(() => EventoEntity, (evento) => evento.madres)
  eventos: EventoEntity[];
}
